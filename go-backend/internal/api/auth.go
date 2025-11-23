package api

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"gc-distribution-portal/internal/config"
	"gc-distribution-portal/internal/middleware"

	"github.com/golang-jwt/jwt/v5"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	config *config.Config
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{config: cfg}
}

// LoginRequest represents login request body
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginResponse represents login response
type LoginResponse struct {
	Success bool              `json:"success"`
	Token   string            `json:"token,omitempty"`
	User    *config.User      `json:"user,omitempty"`
	Message string            `json:"message,omitempty"`
}

// Login handles user login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	if req.Username == "" || req.Password == "" {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Username and password required",
		})
		return
	}

	// Load users
	usersData, err := h.config.LoadUsers()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Server error",
		})
		return
	}

	// Find user by username
	var foundUser *config.User
	for _, user := range usersData.Users {
		if user.Username == req.Username {
			foundUser = &user
			break
		}
	}

	if foundUser == nil {
		respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "Invalid username or password",
		})
		return
	}

	// Verify password (simple check for now - all users have same password)
	// TODO: Use bcrypt for production
	expectedPassword := "Greninja@#7860"
	if req.Password != expectedPassword {
		respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "Invalid username or password",
		})
		return
	}

	// Generate JWT token
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key-change-in-production"
	}

	claims := &middleware.UserClaims{
		Username:    foundUser.Username,
		Email:       foundUser.Email,
		Role:        foundUser.Role,
		Permissions: foundUser.Permissions,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)), // 7 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to generate token",
		})
		return
	}

	respondJSON(w, http.StatusOK, LoginResponse{
		Success: true,
		Token:   tokenString,
		User:    foundUser,
	})
}

// Logout handles user logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// With JWT, logout is handled client-side by removing the token
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Logged out",
	})
}

// Me returns current user info
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"user": map[string]interface{}{
			"email":       user.Email,
			"role":        user.Role,
			"permissions": user.Permissions,
		},
	})
}

// GetAllUsers returns all users (super admin only)
func (h *AuthHandler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || user.Role != "super_admin" {
		respondJSON(w, http.StatusForbidden, map[string]interface{}{
			"success": false,
			"message": "Forbidden",
		})
		return
	}

	usersData, err := h.config.LoadUsers()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Server error",
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"users":   usersData.Users,
	})
}

// UpdatePermissionsRequest represents permission update request
type UpdatePermissionsRequest struct {
	Email       string   `json:"email"`
	Permissions []string `json:"permissions"`
}

// UpdateUserPermissions updates user permissions (super admin only)
func (h *AuthHandler) UpdateUserPermissions(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || user.Role != "super_admin" {
		respondJSON(w, http.StatusForbidden, map[string]interface{}{
			"success": false,
			"message": "Forbidden",
		})
		return
	}

	var req UpdatePermissionsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	if req.Email == "" || req.Permissions == nil {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Email and permissions required",
		})
		return
	}

	usersData, err := h.config.LoadUsers()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Server error",
		})
		return
	}

	// Find and update user
	found := false
	for i, u := range usersData.Users {
		if u.Email == req.Email {
			usersData.Users[i].Permissions = req.Permissions
			found = true
			break
		}
	}

	if !found {
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
			"message": "Failed to save users",
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Permissions updated",
	})
}

// respondJSON is a helper to send JSON responses
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

