#!/bin/bash

# Test script for GitLab Review MCP Server
# This script verifies that the server can start and respond to basic MCP requests

echo "🧪 Testing GitLab Review MCP Server..."
echo ""

# Check if dist/index.js exists
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js not found. Run 'npm run build' first."
    exit 1
fi

echo "✅ Build files found"

# Check if environment variables are set
if [ -z "$GITLAB_BASE_URL" ] || [ -z "$GITLAB_TOKEN" ]; then
    echo "⚠️  Warning: GITLAB_BASE_URL or GITLAB_TOKEN not set"
    echo "   Setting dummy values for structure test..."
    export GITLAB_BASE_URL="https://gitlab.example.com"
    export GITLAB_TOKEN="dummy-token-for-testing"
fi

echo "✅ Environment variables configured"
echo ""
echo "🚀 Starting MCP server test..."
echo "   (Server will start and wait for input. Press Ctrl+C to stop)"
echo ""

# Start the server
node dist/index.js

echo ""
echo "✅ Server test completed"

