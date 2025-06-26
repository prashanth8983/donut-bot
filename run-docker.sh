#!/bin/bash

echo "🚀 Starting Donut Bot with Docker Compose..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create necessary directories
mkdir -p logs
mkdir -p crawler_output

# Build and start all services
echo "📦 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "✅ Donut Bot is starting up!"
echo ""
echo "🌐 Access points:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8089"
echo "   API Docs: http://localhost:8089/docs"
echo "   Kafka UI: http://localhost:8080 (if monitoring profile is enabled)"
echo "   Redis Commander: http://localhost:8081 (if monitoring profile is enabled)"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   View specific service logs: docker-compose logs -f [service-name]"
echo ""
echo "🔧 To enable monitoring tools, run:"
echo "   docker-compose --profile monitoring up -d" 