#!/bin/bash

# Start Backend Server
echo "🚀 Starting Automation Portal Backend..."
echo ""

cd "$(dirname "$0")/backend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
    echo ""
fi

echo "✅ Starting server on http://localhost:5000"
echo ""
npm start

