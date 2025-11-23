package api

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"gc-distribution-portal/internal/config"
	"gc-distribution-portal/internal/middleware"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
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

	// Check if user is active
	if !foundUser.Active {
		respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "Account is deactivated. Please contact administrator.",
		})
		return
	}

	// Verify password - check if it's hashed or plaintext
	passwordValid := false
	if foundUser.Password != "" {
		// Check if password is bcrypt hashed (starts with $2a$ or $2b$)
		if len(foundUser.Password) > 10 && foundUser.Password[0] == '$' {
			// Use bcrypt verification
			err := bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(req.Password))
			passwordValid = (err == nil)
		} else {
			// Plaintext password (legacy support)
			passwordValid = (req.Password == foundUser.Password)
		}
	} else {
		// No password set, use default
		expectedPassword := "Greninja@#7860"
		passwordValid = (req.Password == expectedPassword)
	}

	if !passwordValid {
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

// CreateUserRequest represents create user request
type CreateUserRequest struct {
	Username    string   `json:"username"`
	Email       string   `json:"email"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}

// CreateUser creates a new user (super admin only)
func (h *AuthHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || user.Role != "super_admin" {
		respondJSON(w, http.StatusForbidden, map[string]interface{}{
			"success": false,
			"message": "Forbidden",
		})
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	// Validate required fields
	if req.Username == "" || req.Email == "" || req.Role == "" {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Username, email, and role are required",
		})
		return
	}

	// Validate role
	validRoles := []string{"super_admin", "admin", "user"}
	roleValid := false
	for _, validRole := range validRoles {
		if req.Role == validRole {
			roleValid = true
			break
		}
	}
	if !roleValid {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid role. Must be super_admin, admin, or user",
		})
		return
	}

	// Load current users
	usersData, err := h.config.LoadUsers()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Server error",
		})
		return
	}

	// Check if username or email already exists
	for _, existingUser := range usersData.Users {
		if existingUser.Username == req.Username {
			respondJSON(w, http.StatusConflict, map[string]interface{}{
				"success": false,
				"message": "Username already exists",
			})
			return
		}
		if existingUser.Email == req.Email {
			respondJSON(w, http.StatusConflict, map[string]interface{}{
				"success": false,
				"message": "Email already exists",
			})
			return
		}
	}

	// Set default permissions if not provided
	if req.Permissions == nil || len(req.Permissions) == 0 {
		switch req.Role {
		case "super_admin":
			req.Permissions = []string{"dashboard", "stock_upload", "data_change_operation", "user_management"}
		case "admin":
			req.Permissions = []string{"dashboard", "stock_upload", "data_change_operation"}
		case "user":
			req.Permissions = []string{"dashboard", "stock_upload"}
		}
	}

	// Create new user
	newUser := config.User{
		Username:    req.Username,
		Password:    "$2a$10$YourHashedPasswordHere", // Same placeholder password
		Email:       req.Email,
		Role:        req.Role,
		Permissions: req.Permissions,
		Active:      true, // New users are active by default
	}

	// Add user to the list
	usersData.Users = append(usersData.Users, newUser)

	// Save updated users
	if err := h.config.SaveUsers(usersData); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to save user",
		})
		return
	}

	// Also add email to allowed-users.json
	allowedUsers, err := h.config.LoadAllowedUsers()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to update allowed users",
		})
		return
	}

	// Check if email already in allowed list
	emailExists := false
	for _, email := range allowedUsers {
		if email == req.Email {
			emailExists = true
			break
		}
	}
	if !emailExists {
		allowedUsers = append(allowedUsers, req.Email)
		if err := h.config.SaveAllowedUsers(allowedUsers); err != nil {
			respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"message": "Failed to update allowed users",
			})
			return
		}
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"success": true,
		"message": "User created successfully",
		"user":    newUser,
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

// UserStatusRequest represents user status change request
type UserStatusRequest struct {
	Email  string `json:"email"`
	Active bool   `json:"active"`
}

// UpdateUserStatus updates user active/inactive status (super admin only)
func (h *AuthHandler) UpdateUserStatus(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || user.Role != "super_admin" {
		respondJSON(w, http.StatusForbidden, map[string]interface{}{
			"success": false,
			"message": "Forbidden",
		})
		return
	}

	var req UserStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	if req.Email == "" {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Email is required",
		})
		return
	}

	// Prevent deactivating yourself
	if req.Email == user.Email && !req.Active {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "You cannot deactivate your own account",
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

	// Find and update user status
	found := false
	for i, u := range usersData.Users {
		if u.Email == req.Email {
			usersData.Users[i].Active = req.Active
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
			"message": "Failed to save user status",
		})
		return
	}

	statusText := "activated"
	if !req.Active {
		statusText = "deactivated"
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "User " + statusText + " successfully",
	})
}

// respondJSON is a helper to send JSON responses
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

