package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Config holds the application configuration
type Config struct {
	JWTSecret    string
	ConfigDir    string
	StorageDir   string
	UploadsDir   string
	ProcIDFile   string
}

// User represents a user in the system
type User struct {
	Username    string   `json:"username"`
	Password    string   `json:"password"` // bcrypt hashed
	Email       string   `json:"email"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}

// UsersData holds the users list
type UsersData struct {
	Users []User `json:"users"`
}

// Client represents a client configuration
type Client struct {
	Name    string `json:"name"`
	OfferID string `json:"offer_id"`
}

// Credentials holds environment-specific credentials
type Credentials struct {
	BaseURL  string `json:"base_url"`
	Username string `json:"username"`
	Password string `json:"password"`
}

// Environments holds all environment configurations
type Environments map[string]Credentials

// LoadConfig initializes and returns the application configuration
func LoadConfig() (*Config, error) {
	configDir := "./config"
	storageDir := "./storage"
	uploadsDir := filepath.Join(storageDir, "stock_uploads")
	procIDFile := filepath.Join(storageDir, "procurement_batch_id.txt")

	// Create directories if they don't exist
	os.MkdirAll(configDir, 0755)
	os.MkdirAll(uploadsDir, 0755)

	// JWT secret from env or default
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key-change-in-production"
	}

	return &Config{
		JWTSecret:  jwtSecret,
		ConfigDir:  configDir,
		StorageDir: storageDir,
		UploadsDir: uploadsDir,
		ProcIDFile: procIDFile,
	}, nil
}

// LoadUsers reads users from config file
func (c *Config) LoadUsers() (*UsersData, error) {
	usersPath := filepath.Join(c.ConfigDir, "users.json")
	data, err := os.ReadFile(usersPath)
	if err != nil {
		return nil, err
	}

	var usersData UsersData
	if err := json.Unmarshal(data, &usersData); err != nil {
		return nil, err
	}

	return &usersData, nil
}

// SaveUsers writes users to config file
func (c *Config) SaveUsers(usersData *UsersData) error {
	usersPath := filepath.Join(c.ConfigDir, "users.json")
	data, err := json.MarshalIndent(usersData, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(usersPath, data, 0644)
}

// LoadClients reads clients from config file
func (c *Config) LoadClients() ([]Client, error) {
	clientsPath := filepath.Join(c.ConfigDir, "clients.json")
	data, err := os.ReadFile(clientsPath)
	if err != nil {
		return nil, err
	}

	var clients []Client
	if err := json.Unmarshal(data, &clients); err != nil {
		return nil, err
	}

	return clients, nil
}

// LoadEnvironments reads environment configurations
func (c *Config) LoadEnvironments() (Environments, error) {
	envPath := filepath.Join(c.ConfigDir, "environments.json")
	data, err := os.ReadFile(envPath)
	if err != nil {
		return nil, err
	}

	var envs Environments
	if err := json.Unmarshal(data, &envs); err != nil {
		return nil, err
	}

	return envs, nil
}

