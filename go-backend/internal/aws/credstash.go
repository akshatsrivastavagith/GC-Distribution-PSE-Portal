package aws

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

// CredstashClient wraps credstash CLI for secret retrieval
type CredstashClient struct {
	Region string
}

// NewCredstashClient creates a new Credstash client
func NewCredstashClient(region string) *CredstashClient {
	if region == "" {
		region = "ap-south-1"
	}
	return &CredstashClient{
		Region: region,
	}
}

// Get retrieves a secret from credstash
func (c *CredstashClient) Get(key string) (string, error) {
	cmd := exec.CommandContext(
		context.Background(),
		"credstash",
		"get",
		key,
		"--region", c.Region,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to get secret %s: %w (output: %s)", key, err, string(output))
	}

	// Trim whitespace and newlines
	value := strings.TrimSpace(string(output))
	return value, nil
}

// GetMultiple retrieves multiple secrets at once
func (c *CredstashClient) GetMultiple(keys []string) (map[string]string, error) {
	result := make(map[string]string)
	
	for _, key := range keys {
		value, err := c.Get(key)
		if err != nil {
			return nil, fmt.Errorf("failed to get secret %s: %w", key, err)
		}
		result[key] = value
	}
	
	return result, nil
}

// Environment represents an API environment configuration
type Environment struct {
	BaseURL  string `json:"base_url"`
	Username string `json:"username"`
	Password string `json:"password"`
}

// GetEnvironments loads environment configs from credstash
func (c *CredstashClient) GetEnvironments() (map[string]Environment, error) {
	// Get all Razorpay credentials
	secrets, err := c.GetMultiple([]string{
		"razorpay.test.url",
		"razorpay.test.username",
		"razorpay.test.password",
		"razorpay.prod.url",
		"razorpay.prod.username",
		"razorpay.prod.password",
	})
	if err != nil {
		return nil, err
	}

	environments := map[string]Environment{
		"TEST": {
			BaseURL:  secrets["razorpay.test.url"],
			Username: secrets["razorpay.test.username"],
			Password: secrets["razorpay.test.password"],
		},
		"PROD": {
			BaseURL:  secrets["razorpay.prod.url"],
			Username: secrets["razorpay.prod.username"],
			Password: secrets["razorpay.prod.password"],
		},
	}

	return environments, nil
}

// GetJWTSecret retrieves the JWT secret from credstash
func (c *CredstashClient) GetJWTSecret() (string, error) {
	return c.Get("jwt.secret")
}

// MustGet retrieves a secret or panics if it fails
func (c *CredstashClient) MustGet(key string) string {
	value, err := c.Get(key)
	if err != nil {
		panic(fmt.Sprintf("Failed to get required secret %s: %v", key, err))
	}
	return value
}

// List returns all available secrets
func (c *CredstashClient) List() ([]string, error) {
	cmd := exec.CommandContext(
		context.Background(),
		"credstash",
		"list",
		"--region", c.Region,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to list secrets: %w (output: %s)", err, string(output))
	}

	// Parse output
	lines := strings.Split(string(output), "\n")
	var secrets []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			secrets = append(secrets, line)
		}
	}

	return secrets, nil
}

// Put stores a secret in credstash (used for initial setup)
func (c *CredstashClient) Put(key, value string) error {
	cmd := exec.CommandContext(
		context.Background(),
		"credstash",
		"put",
		key,
		value,
		"--region", c.Region,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to put secret %s: %w (output: %s)", key, err, string(output))
	}

	return nil
}

// MarshalJSON is a helper for JSON serialization
func (e Environment) MarshalJSON() ([]byte, error) {
	return json.Marshal(struct {
		BaseURL  string `json:"base_url"`
		Username string `json:"username"`
		Password string `json:"password"`
	}{
		BaseURL:  e.BaseURL,
		Username: e.Username,
		Password: e.Password,
	})
}

