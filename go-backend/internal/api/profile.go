package api

import (
	"net/http"

	"gc-distribution-portal/internal/config"
	"gc-distribution-portal/internal/middleware"
	"gc-distribution-portal/internal/utils"
)

// ProfileHandler handles profile-related endpoints
type ProfileHandler struct {
	config *config.Config
}

// NewProfileHandler creates a new profile handler
func NewProfileHandler(cfg *config.Config) *ProfileHandler {
	return &ProfileHandler{config: cfg}
}

// GetProfile returns user profile with upload history (with filters)
func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	// Get user from context (set by auth middleware)
	userClaims, ok := r.Context().Value("user").(*middleware.UserClaims)
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Get filter parameters from query string
	environment := r.URL.Query().Get("environment")
	clientName := r.URL.Query().Get("client")
	status := r.URL.Query().Get("status")

	// Get upload history for user with filters
	history, err := utils.GetUserUploadHistory(h.config.ConfigDir, userClaims.Username, environment, clientName, status)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to retrieve upload history",
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"user": map[string]interface{}{
			"username":    userClaims.Username,
			"email":       userClaims.Email,
			"role":        userClaims.Role,
			"permissions": userClaims.Permissions,
		},
		"uploadHistory": history,
	})
}

// GetActivityLog returns activity logs (Super Admin only, with filters)
func (h *ProfileHandler) GetActivityLog(w http.ResponseWriter, r *http.Request) {
	// Get user from context
	userClaims, ok := r.Context().Value("user").(*middleware.UserClaims)
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Only Super Admin can view all activity logs
	if userClaims.Role != "Super Admin" {
		respondJSON(w, http.StatusForbidden, map[string]interface{}{
			"success": false,
			"message": "Only Super Admin can view activity logs",
		})
		return
	}

	// Get filter parameters from query string
	username := r.URL.Query().Get("username")
	operation := r.URL.Query().Get("operation")
	environment := r.URL.Query().Get("environment")

	// Get activity logs with filters
	activities, err := utils.GetAllActivityLog(h.config.ConfigDir, username, operation, environment)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to retrieve activity logs",
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success":    true,
		"activities": activities,
	})
}

// GetAllUploadHistory returns all users' upload history (Super Admin only, with filters)
func (h *ProfileHandler) GetAllUploadHistory(w http.ResponseWriter, r *http.Request) {
	// Get user from context
	userClaims, ok := r.Context().Value("user").(*middleware.UserClaims)
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Only Super Admin can view all upload history
	if userClaims.Role != "Super Admin" {
		respondJSON(w, http.StatusForbidden, map[string]interface{}{
			"success": false,
			"message": "Only Super Admin can view all upload history",
		})
		return
	}

	// Get filter parameters from query string
	username := r.URL.Query().Get("username")
	environment := r.URL.Query().Get("environment")
	clientName := r.URL.Query().Get("client")
	status := r.URL.Query().Get("status")

	// Get all upload history with filters
	history, err := utils.GetAllUploadHistory(h.config.ConfigDir, username, environment, clientName, status)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to retrieve upload history",
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success":       true,
		"uploadHistory": history,
	})
}
