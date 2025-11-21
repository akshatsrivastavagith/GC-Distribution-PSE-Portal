#!/bin/bash

# Start Frontend Development Server
echo "🚀 Starting Automation Portal Frontend..."
echo ""

cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
    echo ""
fi

echo "✅ Starting dev server on http://localhost:5173"
echo ""
npm run dev

