.PHONY: help build run test clean docker-build docker-run install

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install Go dependencies
	go mod download
	go mod verify

build: ## Build the application
	go build -o main .

run: ## Run the application
	go run main.go

test: ## Run tests
	go test -v ./...

clean: ## Clean build artifacts
	rm -f main
	rm -rf storage/stock_uploads/*
	go clean

docker-build: ## Build Docker image
	docker build -t pse-portal-backend:latest .

docker-run: ## Run Docker container
	docker run -p 5001:5001 --name pse-backend pse-portal-backend:latest

docker-compose-up: ## Start all services with docker-compose
	cd .. && docker-compose up -d

docker-compose-down: ## Stop all services
	cd .. && docker-compose down

docker-compose-logs: ## View logs from docker-compose
	cd .. && docker-compose logs -f

dev: ## Run in development mode with hot reload (requires air)
	air

lint: ## Run golangci-lint
	golangci-lint run

format: ## Format code
	go fmt ./...
	gofmt -s -w .

tidy: ## Tidy go.mod
	go mod tidy

