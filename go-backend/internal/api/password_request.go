package api

import (
	"encoding/json"
	"net/http"
	"os"
	"sync"
	"time"

	"gc-distribution-portal/internal/config"
	"gc-distribution-portal/internal/middleware"
	"gc-distribution-portal/internal/utils"
)

// PasswordRequestHandler handles password change requests
type PasswordRequestHandler struct {
	config *config.Config
	mutex  sync.Mutex
}

// NewPasswordRequestHandler creates a new password request handler
func NewPasswordRequestHandler(cfg *config.Config) *PasswordRequestHandler {
	return &PasswordRequestHandler{config: cfg}
}

// PasswordRequest represents a password change request
type PasswordRequest struct {
	ID          string     `json:"id"`
	Username    string     `json:"username"`
	Email       string     `json:"email"`
	Role        string     `json:"role"`
	Status      string     `json:"status"` // pending, approved, rejected
	RequestedAt time.Time  `json:"requestedAt"`
	ReviewedAt  *time.Time `json:"reviewedAt,omitempty"`
	ReviewedBy  string     `json:"reviewedBy,omitempty"`
}

// CreateRequest creates a new password change request
func (h *PasswordRequestHandler) CreateRequest(w http.ResponseWriter, r *http.Request) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	// Get user from context
	userClaims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Load existing requests
	requestsPath := h.config.ConfigDir + "/password_change_requests.json"
	var requests []PasswordRequest
	data, err := os.ReadFile(requestsPath)
	if err == nil {
		json.Unmarshal(data, &requests)
	}

	// Check if user already has a pending request
	for _, req := range requests {
		if req.Username == userClaims.Username && req.Status == "pending" {
			respondJSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"message": "You already have a pending password change request",
			})
			return
		}
	}

	// Create new request
	newRequest := PasswordRequest{
		ID:          utils.GenerateRzpID(),
		Username:    userClaims.Username,
		Email:       userClaims.Email,
		Role:        userClaims.Role,
		Status:      "pending",
		RequestedAt: time.Now(),
	}

	requests = append(requests, newRequest)

	// Save requests
	data, _ = json.MarshalIndent(requests, "", "  ")
	if err := os.WriteFile(requestsPath, data, 0644); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to create password change request",
		})
		return
	}

	// Log activity
	utils.LogActivity(h.config.ConfigDir, userClaims.Username, "Password Change Request", "N/A",
		"User requested password change", "Pending")

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Password change request submitted successfully",
		"request": newRequest,
	})
}

// GetMyRequests gets the current user's password change requests
func (h *PasswordRequestHandler) GetMyRequests(w http.ResponseWriter, r *http.Request) {
	// Get user from context
	userClaims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Load requests
	requestsPath := h.config.ConfigDir + "/password_change_requests.json"
	var requests []PasswordRequest
	data, err := os.ReadFile(requestsPath)
	if err == nil {
		json.Unmarshal(data, &requests)
	}

	// Filter by username
	var userRequests []PasswordRequest
	for _, req := range requests {
		if req.Username == userClaims.Username {
			userRequests = append(userRequests, req)
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"requests": userRequests,
	})
}

// GetAllRequests gets all password change requests (Super Admin only)
func (h *PasswordRequestHandler) GetAllRequests(w http.ResponseWriter, r *http.Request) {
	// Get user from context
	userClaims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Only Super Admin can view all requests
	if userClaims.Role != "super_admin" {
		respondJSON(w, http.StatusForbidden, map[string]interface{}{
			"success": false,
			"message": "Only Super Admin can view all password change requests",
		})
		return
	}

	// Load requests
	requestsPath := h.config.ConfigDir + "/password_change_requests.json"
	var requests []PasswordRequest
	data, err := os.ReadFile(requestsPath)
	if err == nil {
		json.Unmarshal(data, &requests)
	}

	// Return in reverse order (newest first)
	for i, j := 0, len(requests)-1; i < j; i, j = i+1, j-1 {
		requests[i], requests[j] = requests[j], requests[i]
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"requests": requests,
	})
}

// ReviewRequest approves or rejects a password change request (Super Admin only)
func (h *PasswordRequestHandler) ReviewRequest(w http.ResponseWriter, r *http.Request) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	// Get user from context
	userClaims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Only Super Admin can review requests
	if userClaims.Role != "super_admin" {
		respondJSON(w, http.StatusForbidden, map[string]interface{}{
			"success": false,
			"message": "Only Super Admin can review password change requests",
		})
		return
	}

	// Parse request body
	var body struct {
		RequestID string `json:"requestId"`
		Action    string `json:"action"` // approve or reject
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	if body.Action != "approve" && body.Action != "reject" {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Action must be 'approve' or 'reject'",
		})
		return
	}

	// Load requests
	requestsPath := h.config.ConfigDir + "/password_change_requests.json"
	var requests []PasswordRequest
	data, err := os.ReadFile(requestsPath)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to load requests",
		})
		return
	}
	json.Unmarshal(data, &requests)

	// Find and update request
	found := false
	var updatedRequest PasswordRequest
	now := time.Now()
	for i, req := range requests {
		if req.ID == body.RequestID {
			if req.Status != "pending" {
				respondJSON(w, http.StatusBadRequest, map[string]interface{}{
					"success": false,
					"message": "Request has already been reviewed",
				})
				return
			}

			if body.Action == "approve" {
				requests[i].Status = "approved"
			} else {
				requests[i].Status = "rejected"
			}
			requests[i].ReviewedAt = &now
			requests[i].ReviewedBy = userClaims.Username
			updatedRequest = requests[i]
			found = true
			break
		}
	}

	if !found {
		respondJSON(w, http.StatusNotFound, map[string]interface{}{
			"success": false,
			"message": "Request not found",
		})
		return
	}

	// Save updated requests
	data, _ = json.MarshalIndent(requests, "", "  ")
	if err := os.WriteFile(requestsPath, data, 0644); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to update request",
		})
		return
	}

	// Log activity
	activityStatus := "Approved"
	if body.Action == "reject" {
		activityStatus = "Rejected"
	}
	utils.LogActivity(h.config.ConfigDir, userClaims.Username, "Password Change Review", "N/A",
		"Reviewed password change request for "+updatedRequest.Username, activityStatus)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Request " + body.Action + "d successfully",
		"request": updatedRequest,
	})
}

// GetPendingCount returns the count of pending password change requests (Super Admin only)
func (h *PasswordRequestHandler) GetPendingCount(w http.ResponseWriter, r *http.Request) {
	// Get user from context
	userClaims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Only Super Admin can view pending count
	if userClaims.Role != "super_admin" {
		respondJSON(w, http.StatusForbidden, map[string]interface{}{
			"success": false,
			"message": "Only Super Admin can view pending count",
		})
		return
	}

	// Load requests
	requestsPath := h.config.ConfigDir + "/password_change_requests.json"
	var requests []PasswordRequest
	data, err := os.ReadFile(requestsPath)
	if err == nil {
		json.Unmarshal(data, &requests)
	}

	// Count pending requests
	count := 0
	for _, req := range requests {
		if req.Status == "pending" {
			count++
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"count":   count,
	})
}

// ForgotPassword creates a password reset request without authentication
func (h *PasswordRequestHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	// Parse request body
	var body struct {
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	if body.Username == "" {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Username is required",
		})
		return
	}

	// Load users to verify username exists
	usersData, err := h.config.LoadUsers()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to verify username",
		})
		return
	}

	// Find user
	var foundUser *config.User
	for _, user := range usersData.Users {
		if user.Username == body.Username {
			foundUser = &user
			break
		}
	}

	if foundUser == nil {
		respondJSON(w, http.StatusNotFound, map[string]interface{}{
			"success": false,
			"message": "Username not found",
		})
		return
	}

	// Load existing requests
	requestsPath := h.config.ConfigDir + "/password_change_requests.json"
	var requests []PasswordRequest
	data, err := os.ReadFile(requestsPath)
	if err == nil {
		json.Unmarshal(data, &requests)
	}

	// Check if user already has a pending request
	for _, req := range requests {
		if req.Username == body.Username && req.Status == "pending" {
			respondJSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"message": "You already have a pending password reset request. Please wait for Super Admin approval.",
			})
			return
		}
	}

	// Create new request
	newRequest := PasswordRequest{
		ID:          utils.GenerateRzpID(),
		Username:    foundUser.Username,
		Email:       foundUser.Email,
		Role:        foundUser.Role,
		Status:      "pending",
		RequestedAt: time.Now(),
	}

	requests = append(requests, newRequest)

	// Save requests
	data, _ = json.MarshalIndent(requests, "", "  ")
	if err := os.WriteFile(requestsPath, data, 0644); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to create password reset request",
		})
		return
	}

	// Log activity
	utils.LogActivity(h.config.ConfigDir, body.Username, "Password Reset Request", "N/A",
		"User requested password reset (forgot password)", "Pending")

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Password reset request submitted successfully. A Super Admin will review it shortly.",
	})
}

// CheckResetStatus checks if a user has an approved password reset request
func (h *PasswordRequestHandler) CheckResetStatus(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Username is required",
		})
		return
	}

	// Load requests
	requestsPath := h.config.ConfigDir + "/password_change_requests.json"
	var requests []PasswordRequest
	data, err := os.ReadFile(requestsPath)
	if err == nil {
		json.Unmarshal(data, &requests)
	}

	// Check if user has an approved request
	hasApprovedReset := false
	for _, req := range requests {
		if req.Username == username && req.Status == "approved" {
			hasApprovedReset = true
			break
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success":          true,
		"hasApprovedReset": hasApprovedReset,
	})
}

// ResetPassword allows a user to reset their password after approval
func (h *PasswordRequestHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	// Parse request body
	var body struct {
		Username    string `json:"username"`
		NewPassword string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	if body.Username == "" || body.NewPassword == "" {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Username and new password are required",
		})
		return
	}

	if len(body.NewPassword) < 8 {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Password must be at least 8 characters",
		})
		return
	}

	// Load requests
	requestsPath := h.config.ConfigDir + "/password_change_requests.json"
	var requests []PasswordRequest
	data, err := os.ReadFile(requestsPath)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to load password reset requests",
		})
		return
	}
	json.Unmarshal(data, &requests)

	// Check if user has an approved request
	hasApprovedRequest := false
	requestIndex := -1
	for i, req := range requests {
		if req.Username == body.Username && req.Status == "approved" {
			hasApprovedRequest = true
			requestIndex = i
			break
		}
	}

	if !hasApprovedRequest {
		respondJSON(w, http.StatusForbidden, map[string]interface{}{
			"success": false,
			"message": "No approved password reset request found. Please request a password reset first.",
		})
		return
	}

	// Load users
	usersData, err := h.config.LoadUsers()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to load users",
		})
		return
	}

	// Find and update user password
	userFound := false
	for i, user := range usersData.Users {
		if user.Username == body.Username {
			// Hash the new password
			hashedPassword, err := utils.HashPassword(body.NewPassword)
			if err != nil {
				respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
					"success": false,
					"message": "Failed to hash password",
				})
				return
			}
			usersData.Users[i].Password = hashedPassword
			userFound = true
			break
		}
	}

	if !userFound {
		respondJSON(w, http.StatusNotFound, map[string]interface{}{
			"success": false,
			"message": "User not found",
		})
		return
	}

	// Save updated users
	if err := h.config.SaveUsers(usersData); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to update password",
		})
		return
	}

	// Mark the reset request as completed
	requests[requestIndex].Status = "completed"
	now := time.Now()
	requests[requestIndex].ReviewedAt = &now

	// Save updated requests
	data, _ = json.MarshalIndent(requests, "", "  ")
	os.WriteFile(requestsPath, data, 0644)

	// Log activity
	utils.LogActivity(h.config.ConfigDir, body.Username, "Password Reset Completed", "N/A",
		"User successfully reset their password", "Success")

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Password reset successfully. Please login with your new password.",
	})
}
