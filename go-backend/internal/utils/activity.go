package utils

import (
	"encoding/json"
	"os"
	"sync"
	"time"
)

// ActivityLog represents a single activity entry
type ActivityLog struct {
	ID          string    `json:"id"`
	Username    string    `json:"username"`
	Operation   string    `json:"operation"`
	Environment string    `json:"environment"`
	Details     string    `json:"details"`
	Status      string    `json:"status"`
	Timestamp   time.Time `json:"timestamp"`
}

// UploadHistory represents upload history entry
type UploadHistory struct {
	ID                 string    `json:"id"`
	Username           string    `json:"username"`
	FileName           string    `json:"fileName"`
	Environment        string    `json:"environment"`
	ClientName         string    `json:"clientName"`
	OfferID            string    `json:"offerID"`
	TotalRows          int       `json:"totalRows"`
	SuccessRows        int       `json:"successRows"`
	FailedRows         int       `json:"failedRows"`
	ProcurementBatchID string    `json:"procurementBatchID"`
	Status             string    `json:"status"`
	Timestamp          time.Time `json:"timestamp"`
}

var activityMutex sync.Mutex
var uploadHistoryMutex sync.Mutex

// LogActivity logs a user activity
func LogActivity(configDir, username, operation, environment, details, status string) error {
	activityMutex.Lock()
	defer activityMutex.Unlock()

	activityPath := configDir + "/activity_log.json"

	// Read existing activities
	var activities []ActivityLog
	data, err := os.ReadFile(activityPath)
	if err == nil {
		json.Unmarshal(data, &activities)
	}

	// Create new activity
	activity := ActivityLog{
		ID:          GenerateRzpID(),
		Username:    username,
		Operation:   operation,
		Environment: environment,
		Details:     details,
		Status:      status,
		Timestamp:   time.Now(),
	}

	// Append and save
	activities = append(activities, activity)

	// Keep only last 500 entries
	if len(activities) > 500 {
		activities = activities[len(activities)-500:]
	}

	data, _ = json.MarshalIndent(activities, "", "  ")
	return os.WriteFile(activityPath, data, 0644)
}

// LogUploadHistory logs upload history
func LogUploadHistory(configDir string, history UploadHistory) error {
	uploadHistoryMutex.Lock()
	defer uploadHistoryMutex.Unlock()

	historyPath := configDir + "/upload_history.json"

	// Read existing history
	var histories []UploadHistory
	data, err := os.ReadFile(historyPath)
	if err == nil {
		json.Unmarshal(data, &histories)
	}

	// Append and save
	histories = append(histories, history)

	// Keep only last 1000 entries
	if len(histories) > 1000 {
		histories = histories[len(histories)-1000:]
	}

	data, _ = json.MarshalIndent(histories, "", "  ")
	return os.WriteFile(historyPath, data, 0644)
}

// GetUserUploadHistory retrieves upload history for a user with optional filters
func GetUserUploadHistory(configDir, username, environment, clientName, status string) ([]UploadHistory, error) {
	historyPath := configDir + "/upload_history.json"

	var histories []UploadHistory
	data, err := os.ReadFile(historyPath)
	if err != nil {
		return histories, nil // Return empty if file doesn't exist
	}

	if err := json.Unmarshal(data, &histories); err != nil {
		return nil, err
	}

	// Filter by username and other criteria
	var userHistories []UploadHistory
	for _, h := range histories {
		if h.Username != username {
			continue
		}
		if environment != "" && h.Environment != environment {
			continue
		}
		if clientName != "" && h.ClientName != clientName {
			continue
		}
		if status != "" && h.Status != status {
			continue
		}
		userHistories = append(userHistories, h)
	}

	// Return in reverse order (newest first)
	for i, j := 0, len(userHistories)-1; i < j; i, j = i+1, j-1 {
		userHistories[i], userHistories[j] = userHistories[j], userHistories[i]
	}

	return userHistories, nil
}

// GetAllActivityLog retrieves all activity logs with optional filters
func GetAllActivityLog(configDir, username, operation, environment string) ([]ActivityLog, error) {
	activityPath := configDir + "/activity_log.json"

	var activities []ActivityLog
	data, err := os.ReadFile(activityPath)
	if err != nil {
		return activities, nil // Return empty if file doesn't exist
	}

	if err := json.Unmarshal(data, &activities); err != nil {
		return nil, err
	}

	// Apply filters
	var filtered []ActivityLog
	for _, a := range activities {
		if username != "" && a.Username != username {
			continue
		}
		if operation != "" && a.Operation != operation {
			continue
		}
		if environment != "" && a.Environment != environment {
			continue
		}
		filtered = append(filtered, a)
	}

	// Return in reverse order (newest first)
	for i, j := 0, len(filtered)-1; i < j; i, j = i+1, j-1 {
		filtered[i], filtered[j] = filtered[j], filtered[i]
	}

	return filtered, nil
}

// GetAllUploadHistory retrieves all users' upload history with optional filters (Super Admin only)
func GetAllUploadHistory(configDir, username, environment, clientName, status string) ([]UploadHistory, error) {
	historyPath := configDir + "/upload_history.json"

	var histories []UploadHistory
	data, err := os.ReadFile(historyPath)
	if err != nil {
		return histories, nil // Return empty if file doesn't exist
	}

	if err := json.Unmarshal(data, &histories); err != nil {
		return nil, err
	}

	// Apply filters
	var filtered []UploadHistory
	for _, h := range histories {
		if username != "" && h.Username != username {
			continue
		}
		if environment != "" && h.Environment != environment {
			continue
		}
		if clientName != "" && h.ClientName != clientName {
			continue
		}
		if status != "" && h.Status != status {
			continue
		}
		filtered = append(filtered, h)
	}

	// Return in reverse order (newest first)
	for i, j := 0, len(filtered)-1; i < j; i, j = i+1, j-1 {
		filtered[i], filtered[j] = filtered[j], filtered[i]
	}

	return filtered, nil
}
