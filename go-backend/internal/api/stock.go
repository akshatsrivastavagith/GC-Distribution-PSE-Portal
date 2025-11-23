package api

import (
	"bytes"
	"encoding/base64"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"gc-distribution-portal/internal/config"
	"gc-distribution-portal/internal/utils"

	"github.com/gorilla/mux"
)

// StockHandler handles stock upload endpoints
type StockHandler struct {
	config *config.Config
}

// NewStockHandler creates a new stock handler
func NewStockHandler(cfg *config.Config) *StockHandler {
	return &StockHandler{config: cfg}
}

// UploadMetadata represents upload metadata
type UploadMetadata struct {
	RunID              string      `json:"runId"`
	FileName           string      `json:"fileName"`
	User               string      `json:"user"`
	Env                string      `json:"env"`
	Client             interface{} `json:"client"`
	AmountType         string      `json:"amountType"`
	RzpCommissionInput string      `json:"rzpCommissionInput"`
}

// ControlState represents control file structure
type ControlState struct {
	State string `json:"state"`
}

// StartUpload handles the file upload and starts processing
func (h *StockHandler) StartUpload(hub *WebSocketHub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse multipart form (max 32MB)
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			respondJSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"message": "Failed to parse form",
			})
			return
		}

		// Get file
		file, header, err := r.FormFile("file")
		if err != nil {
			respondJSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"message": "File required",
			})
			return
		}
		defer file.Close()

		// Get form values
		email := r.FormValue("email")
		env := r.FormValue("env")
		clientStr := r.FormValue("client")
		amountType := r.FormValue("amountType")
		rzpCommission := r.FormValue("rzpCommission")

		// Create run ID and folder
		timestamp := time.Now().Format("2006-01-02T15-04-05")
		fileName := strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename))
		runID := fmt.Sprintf("%s_%s", fileName, timestamp)
		runFolder := filepath.Join(h.config.UploadsDir, runID)

		if err := os.MkdirAll(runFolder, 0755); err != nil {
			respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"message": "Failed to create run folder",
			})
			return
		}

		// Save uploaded file
		rawPath := filepath.Join(runFolder, "raw.csv")
		dst, err := os.Create(rawPath)
		if err != nil {
			respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"message": "Failed to save file",
			})
			return
		}
		if _, err := io.Copy(dst, file); err != nil {
			dst.Close()
			respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"message": "Failed to write file",
			})
			return
		}
		dst.Close()

		// Parse client JSON
		var clientData interface{}
		if clientStr != "" {
			json.Unmarshal([]byte(clientStr), &clientData)
		}

		// Save metadata
		meta := UploadMetadata{
			RunID:              runID,
			FileName:           header.Filename,
			User:               email,
			Env:                env,
			Client:             clientData,
			AmountType:         amountType,
			RzpCommissionInput: rzpCommission,
		}
		metaPath := filepath.Join(runFolder, "meta.json")
		metaData, _ := json.MarshalIndent(meta, "", "  ")
		os.WriteFile(metaPath, metaData, 0644)

		// Generate procurement ID
		procID := utils.GenerateRzpID()
		os.WriteFile(filepath.Join(runFolder, "procurement_batch_id.txt"), []byte(procID), 0644)
		
		// Append to global procurement file
		f, _ := os.OpenFile(h.config.ProcIDFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if f != nil {
			f.WriteString(fmt.Sprintf("%s %s\n", procID, header.Filename))
			f.Close()
		}

		// Create control file
		controlPath := filepath.Join(runFolder, "control.json")
		controlData, _ := json.Marshal(ControlState{State: "running"})
		os.WriteFile(controlPath, controlData, 0644)

	// Start upload process in background
	go h.runUploadProcess(runID, runFolder, rawPath, env, rzpCommission, clientData, hub)

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"success":   true,
			"runId":     runID,
			"runFolder": runFolder,
		})
	}
}

// VoucherRecord represents a single voucher from CSV
type VoucherRecord struct {
	VoucherCode      string
	Pin              string
	Amount           int // in paise
	OriginalAmount   string // original amount from CSV
	ExpiryDate       int64 // Unix timestamp
	OriginalValidity string // original validity from CSV
	RowNumber        int
	OriginalRow      []string // entire original CSV row
}

// UploadResult represents the result of a voucher upload
type UploadResult struct {
	RowNumber       int
	VoucherCode     string
	OriginalRow     []string
	ClientName      string
	OfferID         string
	RzpCommission   string
	EpochTime       int64
	ProcurementID   string
	Success         bool
	StatusCode      int
	ErrorMessage    string
	APIResponse     string
	RetryCount      int
	OriginalValidity string
}

// runUploadProcess executes the voucher upload logic in Go
func (h *StockHandler) runUploadProcess(runID, runFolder, csvPath, env, rzpCommission string, clientData interface{}, hub *WebSocketHub) {
	// Read metadata for logging
	metaPath := filepath.Join(runFolder, "meta.json")
	metaBytes, _ := os.ReadFile(metaPath)
	var metadata UploadMetadata
	json.Unmarshal(metaBytes, &metadata)

	// Create log file
	logPath := filepath.Join(runFolder, "terminal_output.log")
	logFile, err := os.Create(logPath)
	if err != nil {
		hub.Broadcast(runID, fmt.Sprintf("ERROR: Failed to create log file: %v\n", err))
		hub.BroadcastFinished(runID, 1)
		return
	}
	defer logFile.Close()

	logWriter := &logBroadcaster{file: logFile, hub: hub, runID: runID}
	
	// Load environment configurations
	envs, err := h.config.LoadEnvironments()
	if err != nil {
		logWriter.Write(fmt.Sprintf("ERROR: Failed to load environments: %v\n", err))
		hub.BroadcastFinished(runID, 1)
		return
	}

	envKey := strings.ToUpper(env)
	envConfig, ok := envs[envKey]
	if !ok {
		logWriter.Write(fmt.Sprintf("ERROR: Environment '%s' not found in configuration\n", envKey))
		hub.BroadcastFinished(runID, 1)
		return
	}

	// Parse commission
	commissionFloat := 0.0
	fmt.Sscanf(rzpCommission, "%f", &commissionFloat)
	commission := int(commissionFloat * 100)

	// Extract offer_id and client name from client data
	var offerID string
	var clientName string
	if clientMap, ok := clientData.(map[string]interface{}); ok {
		if oid, ok := clientMap["offer_id"].(string); ok {
			offerID = oid
		}
		if name, ok := clientMap["name"].(string); ok {
			clientName = name
		}
	}

	logWriter.Write("=============================================================\n")
	logWriter.Write(fmt.Sprintf("Environment: %s\n", envKey))
	logWriter.Write(fmt.Sprintf("API Base URL: %s\n", envConfig.BaseURL))
	logWriter.Write(fmt.Sprintf("API Endpoint: /offers/voucher-benefits\n"))
	logWriter.Write(fmt.Sprintf("Offer ID: %s\n", offerID))
	logWriter.Write(fmt.Sprintf("RZP Commission: %d (DB value: %d)\n", int(commissionFloat), commission))
	logWriter.Write("=============================================================\n\n")

	// Parse CSV
	vouchers, headers, err := h.parseCSV(csvPath, offerID, commission, logWriter)
	if err != nil {
		logWriter.Write(fmt.Sprintf("ERROR: Failed to parse CSV: %v\n", err))
		hub.BroadcastFinished(runID, 1)
		return
	}

	logWriter.Write(fmt.Sprintf("Found %d vouchers to upload\n\n", len(vouchers)))

	// Read procurement batch ID
	procIDBytes, _ := os.ReadFile(filepath.Join(runFolder, "procurement_batch_id.txt"))
	procurementBatchID := strings.TrimSpace(string(procIDBytes))

	// Upload vouchers
	results := h.uploadVouchers(vouchers, envConfig, procurementBatchID, offerID, commission, clientName, rzpCommission, runID, runFolder, logWriter, hub)

	// Save results and get file paths
	resultCsvPath, failedCsvPath := h.saveResults(results, headers, runFolder, logWriter)

	// Calculate summary
	successCount := 0
	failedCount := 0
	for _, r := range results {
		if r.Success {
			successCount++
		} else {
			failedCount++
		}
	}

	logWriter.Write("\n=============================================================\n")
	logWriter.Write(fmt.Sprintf("Upload Summary:\n"))
	logWriter.Write(fmt.Sprintf("Total: %d, Success: %d, Failed: %d\n", len(vouchers), successCount, failedCount))
	logWriter.Write(fmt.Sprintf("Procurement Batch ID: %s\n", procurementBatchID))
	logWriter.Write("=============================================================\n")

	// Broadcast summary as structured JSON
	summaryData := map[string]interface{}{
		"total":              len(vouchers),
		"success":            successCount,
		"failed":             failedCount,
		"procurementBatchID": procurementBatchID,
		"failedResults":      []UploadResult{},
		"resultCsvPath":      resultCsvPath,
		"failedCsvPath":      failedCsvPath,
		"runId":              runID,
	}

	// Include failed results for preview
	if len(results) > 0 {
		failedList := []UploadResult{}
		for _, r := range results {
			if !r.Success {
				failedList = append(failedList, r)
			}
		}
		summaryData["failedResults"] = failedList
	}

	summaryJSON, _ := json.Marshal(summaryData)
	hub.Broadcast(runID, fmt.Sprintf("SUMMARY:%s\n", string(summaryJSON)))

	exitCode := 0
	if failedCount > 0 {
		exitCode = 1
	}
	hub.BroadcastFinished(runID, exitCode)

	// Log upload activity and history
	status := "Success"
	if failedCount > 0 {
		if successCount == 0 {
			status = "Failed"
		} else {
			status = "Partial Success"
		}
	}

	details := fmt.Sprintf("File: %s, Client: %s, Total: %d, Success: %d, Failed: %d", 
		metadata.FileName, clientName, len(vouchers), successCount, failedCount)
	
	utils.LogActivity(h.config.ConfigDir, metadata.User, "Stock Upload", envKey, details, status)
	
	utils.LogUploadHistory(h.config.ConfigDir, utils.UploadHistory{
		ID:                 runID,
		Username:           metadata.User,
		FileName:           metadata.FileName,
		Environment:        envKey,
		ClientName:         clientName,
		OfferID:            offerID,
		TotalRows:          len(vouchers),
		SuccessRows:        successCount,
		FailedRows:         failedCount,
		ProcurementBatchID: procurementBatchID,
		Status:             status,
		Timestamp:          time.Now(),
	})
}

// logBroadcaster writes to both file and WebSocket
type logBroadcaster struct {
	file  *os.File
	hub   *WebSocketHub
	runID string
	mu    sync.Mutex
}

func (lb *logBroadcaster) Write(message string) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	lb.file.WriteString(message)
	lb.hub.Broadcast(lb.runID, message)
}

// parseCSV reads and parses the CSV file
func (h *StockHandler) parseCSV(csvPath, offerID string, commission int, logWriter *logBroadcaster) ([]VoucherRecord, []string, error) {
	file, err := os.Open(csvPath)
	if err != nil {
		return nil, nil, err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return nil, nil, err
	}

	if len(records) < 2 {
		return nil, nil, fmt.Errorf("CSV file is empty or has no data rows")
	}

	// Parse headers and map column names
	headers := records[0]
	columnMap := make(map[string]int)
	
	for i, header := range headers {
		normalized := strings.ToLower(strings.TrimSpace(header))
		
		// Map voucher code columns
		if normalized == "code" || normalized == "cardnumber" || normalized == "card number" {
			columnMap["voucher_code"] = i
		}
		// Map PIN columns
		if normalized == "secret" || normalized == "cardpin" || normalized == "pin" {
			columnMap["pin"] = i
		}
		// Map amount columns
		if normalized == "amount" || normalized == "denomination" {
			columnMap["voucher_value"] = i
		}
		// Map validity columns
		if normalized == "validity" || normalized == "expirydate" || normalized == "expiry date" {
			columnMap["expiry_date"] = i
		}
	}

	// Verify required columns exist
	if _, ok := columnMap["voucher_code"]; !ok {
		return nil, nil, fmt.Errorf("required column 'voucher_code' (or 'code'/'cardnumber') not found")
	}
	if _, ok := columnMap["voucher_value"]; !ok {
		return nil, nil, fmt.Errorf("required column 'voucher_value' (or 'amount'/'denomination') not found")
	}
	if _, ok := columnMap["expiry_date"]; !ok {
		return nil, nil, fmt.Errorf("required column 'expiry_date' (or 'validity') not found")
	}

	// Parse data rows
	vouchers := []VoucherRecord{}
	for i, record := range records[1:] {
		rowNum := i + 2 // Excel row number (header is row 1)

		voucherCode := strings.TrimSpace(record[columnMap["voucher_code"]])
		amountStr := strings.TrimSpace(record[columnMap["voucher_value"]])
		expiryStr := strings.TrimSpace(record[columnMap["expiry_date"]])

		// Parse amount (convert to paise)
		amount, err := strconv.Atoi(amountStr)
		if err != nil {
			logWriter.Write(fmt.Sprintf("Warning: Invalid amount in row %d: %s\n", rowNum, amountStr))
			continue
		}
		amount = amount * 100 // Convert to paise

		// Parse expiry date
		expiryDate, err := h.parseDate(expiryStr)
		if err != nil {
			logWriter.Write(fmt.Sprintf("Warning: Invalid date in row %d: %s\n", rowNum, expiryStr))
			continue
		}

		voucher := VoucherRecord{
			VoucherCode:      voucherCode,
			Amount:           amount,
			OriginalAmount:   amountStr,
			ExpiryDate:       expiryDate,
			OriginalValidity: expiryStr,
			RowNumber:        rowNum,
			OriginalRow:      record,
		}

		// Add PIN if available
		if pinCol, ok := columnMap["pin"]; ok && pinCol < len(record) {
			voucher.Pin = strings.TrimSpace(record[pinCol])
		}

		vouchers = append(vouchers, voucher)
	}

	return vouchers, headers, nil
}

// parseDate parses various date formats and returns Unix timestamp
func (h *StockHandler) parseDate(dateStr string) (int64, error) {
	dateStr = strings.TrimSpace(dateStr)
	
	// Try parsing as Unix timestamp first
	if timestamp, err := strconv.ParseInt(dateStr, 10, 64); err == nil {
		return timestamp, nil
	}

	// List of date formats to try
	formats := []string{
		"2006-01-02 15:04:05 UTC",
		"2006-01-02 15:04:05",
		"2006-01-02",
		"02-01-2006", // DD-MM-YYYY
		"2-Jan-2006, 15:04",
		"2-January-2006, 15:04",
		"1/2/06", // M/D/YY
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t.Unix(), nil
		}
	}

	return 0, fmt.Errorf("unable to parse date: %s", dateStr)
}

// uploadVouchers uploads vouchers with rate limiting and retries
func (h *StockHandler) uploadVouchers(vouchers []VoucherRecord, envConfig config.Credentials, procurementBatchID, offerID string, commission int, clientName, rzpCommission, runID, runFolder string, logWriter *logBroadcaster, hub *WebSocketHub) []UploadResult {
	const (
		maxWorkers = 3
		maxRetries = 3
		rateLimit  = 3 // requests per second
	)

	results := make([]UploadResult, len(vouchers))
	var wg sync.WaitGroup
	var completed int32 = 0
	semaphore := make(chan struct{}, maxWorkers)
	rateLimiter := time.NewTicker(time.Second / time.Duration(rateLimit))
	defer rateLimiter.Stop()

	controlPath := filepath.Join(runFolder, "control.json")
	totalVouchers := len(vouchers)

	for i, voucher := range vouchers {
		wg.Add(1)
		go func(index int, v VoucherRecord) {
			defer wg.Done()

			// Check control file FIRST, before acquiring any resources
			controlData, _ := os.ReadFile(controlPath)
			var control ControlState
			json.Unmarshal(controlData, &control)

			// Handle pause - check immediately before starting anything
			for control.State == "paused" {
				time.Sleep(time.Second)
				controlData, _ = os.ReadFile(controlPath)
				json.Unmarshal(controlData, &control)
			}

			// Handle stop
			if control.State == "stopped" {
				results[index] = UploadResult{
					RowNumber:        v.RowNumber,
					VoucherCode:      v.VoucherCode,
					OriginalRow:      v.OriginalRow,
					ClientName:       clientName,
					OfferID:          offerID,
					RzpCommission:    rzpCommission,
					EpochTime:        v.ExpiryDate,
					ProcurementID:    procurementBatchID,
					Success:          false,
					ErrorMessage:     "Stopped by user",
					OriginalValidity: v.OriginalValidity,
				}
				return
			}

			// Wait for rate limiter
			<-rateLimiter.C

			// Acquire semaphore
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			// Check control file again before upload (in case state changed while waiting)
			controlData, _ = os.ReadFile(controlPath)
			json.Unmarshal(controlData, &control)

			// Handle pause again
			for control.State == "paused" {
				time.Sleep(time.Second)
				controlData, _ = os.ReadFile(controlPath)
				json.Unmarshal(controlData, &control)
			}

			// Handle stop again
			if control.State == "stopped" {
				results[index] = UploadResult{
					RowNumber:        v.RowNumber,
					VoucherCode:      v.VoucherCode,
					OriginalRow:      v.OriginalRow,
					ClientName:       clientName,
					OfferID:          offerID,
					RzpCommission:    rzpCommission,
					EpochTime:        v.ExpiryDate,
					ProcurementID:    procurementBatchID,
					Success:          false,
					ErrorMessage:     "Stopped by user",
					OriginalValidity: v.OriginalValidity,
				}
				return
			}

			// Upload with retries
			result := h.uploadSingleVoucher(v, envConfig, procurementBatchID, offerID, commission, clientName, rzpCommission, maxRetries, logWriter)
			results[index] = result

			// Update progress atomically
			currentCompleted := atomic.AddInt32(&completed, 1)
			percentage := int(float64(currentCompleted) / float64(totalVouchers) * 100)
			
			// Broadcast progress
			progressMsg := fmt.Sprintf("PROGRESS:%d:%d:%d\n", completed, totalVouchers, percentage)
			hub.Broadcast(runID, progressMsg)

		}(i, voucher)
	}

	wg.Wait()
	return results
}

// uploadSingleVoucher uploads a single voucher with retries
func (h *StockHandler) uploadSingleVoucher(voucher VoucherRecord, envConfig config.Credentials, procurementBatchID, offerID string, commission int, clientName, rzpCommission string, maxRetries int, logWriter *logBroadcaster) UploadResult {
	result := UploadResult{
		RowNumber:        voucher.RowNumber,
		VoucherCode:      voucher.VoucherCode,
		OriginalRow:      voucher.OriginalRow,
		ClientName:       clientName,
		OfferID:          offerID,
		RzpCommission:    rzpCommission,
		EpochTime:        voucher.ExpiryDate,
		ProcurementID:    procurementBatchID,
		OriginalValidity: voucher.OriginalValidity,
	}

	// Create payload
	payload := map[string]interface{}{
		"voucher_benefits": []map[string]interface{}{
			{
				"offer_id":              offerID,
				"voucher_type":          "VOUCHER_TYPE_PERSONALISED",
				"voucher_status":        "VOUCHER_BENEFIT_STATUS_UNCLAIMED",
				"voucher_value":         voucher.Amount,
				"expiry_date":           voucher.ExpiryDate,
				"voucher_code":          voucher.VoucherCode,
				"rzp_commission":        strconv.Itoa(commission),
				"procurement_batch_id":  procurementBatchID,
			},
		},
	}

	if voucher.Pin != "" {
		payload["voucher_benefits"].([]map[string]interface{})[0]["pin"] = voucher.Pin
	}

	payloadBytes, _ := json.Marshal(payload)

	// Create HTTP client
	client := &http.Client{Timeout: 30 * time.Second}

	// Retry logic
	for attempt := 1; attempt <= maxRetries; attempt++ {
		result.RetryCount = attempt

		// Create request
		url := envConfig.BaseURL + "/offers/voucher-benefits"
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
		if err != nil {
			result.ErrorMessage = err.Error()
			continue
		}

		// Set headers
		auth := base64.StdEncoding.EncodeToString([]byte(envConfig.Username + ":" + envConfig.Password))
		req.Header.Set("Authorization", "Basic "+auth)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-Type", "advertiser")
		req.Header.Set("X-User-Id", "rzp.merchant.MK6oPUp488NKF6")

		// Make request
		resp, err := client.Do(req)
		if err != nil {
			result.ErrorMessage = err.Error()
			if attempt < maxRetries {
				time.Sleep(time.Second * 2)
				continue
			}
			break
		}

		result.StatusCode = resp.StatusCode
		bodyBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		result.APIResponse = string(bodyBytes)

		// Format validity for display (readable format with epoch in brackets)
		validityDisplay := fmt.Sprintf("%s (%d)", voucher.OriginalValidity, voucher.ExpiryDate)

		if resp.StatusCode == 200 {
			result.Success = true
			// Format: ClientName, VoucherCode, Commission, Validity (Epoch), Success
			logMsg := fmt.Sprintf("ROW_LOG:%s,%s,%s,%s,Success\n", clientName, voucher.VoucherCode, rzpCommission, validityDisplay)
			logWriter.Write(logMsg)
			return result
		} else if resp.StatusCode == 429 {
			// Rate limited, retry with longer delay
			result.ErrorMessage = "Rate limited"
			if attempt < maxRetries {
				time.Sleep(time.Second * 5)
				continue
			}
		} else {
			result.ErrorMessage = string(bodyBytes)
			if attempt < maxRetries {
				time.Sleep(time.Second * 2)
				continue
			}
		}
	}

	result.Success = false
	// Format validity for display
	validityDisplay := fmt.Sprintf("%s (%d)", voucher.OriginalValidity, voucher.ExpiryDate)
	// Format: ClientName, VoucherCode, Commission, Validity (Epoch), Failure
	logMsg := fmt.Sprintf("ROW_LOG:%s,%s,%s,%s,Failure - %s\n", clientName, voucher.VoucherCode, rzpCommission, validityDisplay, result.ErrorMessage)
	logWriter.Write(logMsg)
	return result
}

// saveResults saves upload results to CSV files and returns the file paths
func (h *StockHandler) saveResults(results []UploadResult, headers []string, runFolder string, logWriter *logBroadcaster) (string, string) {
	timestamp := time.Now().Format("20060102_150405")
	
	// Save all results
	allResultsPath := filepath.Join(runFolder, fmt.Sprintf("upload_results_%s.csv", timestamp))
	h.writeEnhancedResultsCSV(results, headers, allResultsPath)
	logWriter.Write(fmt.Sprintf("\nResults saved to: %s\n", allResultsPath))

	// Save failed results
	failedResults := []UploadResult{}
	for _, r := range results {
		if !r.Success {
			failedResults = append(failedResults, r)
		}
	}

	failedResultsPath := ""
	if len(failedResults) > 0 {
		failedResultsPath = filepath.Join(runFolder, fmt.Sprintf("failed_uploads_%s.csv", timestamp))
		h.writeEnhancedResultsCSV(failedResults, headers, failedResultsPath)
		logWriter.Write(fmt.Sprintf("Failed uploads saved to: %s\n", failedResultsPath))
	}
	
	return filepath.Base(allResultsPath), filepath.Base(failedResultsPath)
}

// writeEnhancedResultsCSV writes enhanced results to a CSV file with all columns
func (h *StockHandler) writeEnhancedResultsCSV(results []UploadResult, originalHeaders []string, filePath string) error {
	file, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Build header: Original columns + new columns
	enhancedHeaders := append([]string{}, originalHeaders...)
	enhancedHeaders = append(enhancedHeaders, "client_name", "offer_id", "rzp_commission", "epoch_time", "procurement_batch_id", "success_failure", "api_response")
	writer.Write(enhancedHeaders)

	// Write data rows
	for _, r := range results {
		// Start with original row data
		row := append([]string{}, r.OriginalRow...)
		
		// Add new columns
		successFailure := "Success"
		if !r.Success {
			successFailure = "Failure"
		}
		
		row = append(row,
			r.ClientName,
			r.OfferID,
			r.RzpCommission,
			strconv.FormatInt(r.EpochTime, 10),
			r.ProcurementID,
			successFailure,
			r.APIResponse,
		)
		
		writer.Write(row)
	}

	return nil
}

// ControlRun handles pause/resume/stop actions
func (h *StockHandler) ControlRun(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	runID := vars["runId"]

	var req struct {
		Action string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	runFolder := filepath.Join(h.config.UploadsDir, runID)
	controlPath := filepath.Join(runFolder, "control.json")

	// Check if control file exists
	if _, err := os.Stat(controlPath); os.IsNotExist(err) {
		respondJSON(w, http.StatusNotFound, map[string]interface{}{
			"success": false,
			"message": "Run not found",
		})
		return
	}

	// Read current control state
	data, err := os.ReadFile(controlPath)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Cannot read control file",
		})
		return
	}

	var control ControlState
	json.Unmarshal(data, &control)

	// Update state based on action
	switch req.Action {
	case "pause":
		control.State = "paused"
	case "resume":
		control.State = "running"
	case "stop":
		control.State = "stopped"
	default:
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid action",
		})
		return
	}

	// Save updated control state
	updatedData, _ := json.MarshalIndent(control, "", "  ")
	if err := os.WriteFile(controlPath, updatedData, 0644); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Cannot update control file",
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"state":   control.State,
	})
}

// SaveClients handles saving client configurations
func (h *StockHandler) SaveClients(w http.ResponseWriter, r *http.Request) {
	var clients []map[string]string
	if err := json.NewDecoder(r.Body).Decode(&clients); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	clientsPath := filepath.Join(h.config.ConfigDir, "clients.json")
	data, err := json.MarshalIndent(clients, "", "  ")
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to marshal clients",
		})
		return
	}

	if err := os.WriteFile(clientsPath, data, 0644); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to save clients",
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Clients saved successfully",
	})
}

// DownloadFile handles file downloads
func (h *StockHandler) DownloadFile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	runID := vars["runId"]
	filename := vars["filename"]

	// Construct file path
	filePath := filepath.Join(h.config.UploadsDir, runID, filename)

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		respondJSON(w, http.StatusNotFound, map[string]interface{}{
			"success": false,
			"message": "File not found",
		})
		return
	}

	// Set headers for download
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	w.Header().Set("Content-Type", "text/csv")

	// Serve the file
	http.ServeFile(w, r, filePath)
}

