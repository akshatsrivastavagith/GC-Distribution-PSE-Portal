#!/bin/bash

# Start the Go backend server

set -e

echo "🚀 Starting PSE Portal Go Backend..."

# Change to backend directory
cd "$(dirname "$0")/go-backend"

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Error: Go is not installed"
    echo "Please install Go 1.21 or higher from https://go.dev/dl/"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

# Check if required directories exist
if [ ! -d "config" ]; then
    echo "📁 Creating config directory..."
    mkdir -p config
fi

if [ ! -d "storage" ]; then
    echo "📁 Creating storage directory..."
    mkdir -p storage/stock_uploads
fi

# Check if config files exist
if [ ! -f "config/users.json" ]; then
    echo "⚠️  Warning: config/users.json not found"
    echo "Please create this file with your user configuration"
fi

# Download dependencies
echo "📦 Downloading Go dependencies..."
go mod download

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "⚠️  Please update .env with your configuration"
    fi
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check if port is already in use
PORT=${PORT:-5001}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Warning: Port $PORT is already in use"
    echo "Please stop the process or change the PORT in .env file"
    exit 1
fi

# Build and run
echo "🔨 Building application..."
go build -o main .

echo "✅ Go Backend is running on http://localhost:$PORT"
echo "📡 WebSocket available at ws://localhost:$PORT/ws"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the server
./main

