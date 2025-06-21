#!/bin/bash

echo "🚀 Starting Donut Bot with Docker Compose..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found"
    exit 1
fi

# Create necessary directories
mkdir -p logs output ssl

echo "📦 Starting core services (Redis, Kafka, Zookeeper, Web Crawler)..."

# Start services
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check health
echo "🔍 Checking service health..."
if curl -f http://localhost:8089/api/v1/health > /dev/null 2>&1; then
    echo ""
    echo "✅ Donut Bot is ready!"
    echo ""
    echo "🌐 Access Points:"
    echo "   API: http://localhost:8089/api/v1/"
    echo "   Health: http://localhost:8089/api/v1/health"
    echo "   Status: http://localhost:8089/api/v1/crawler/status"
    echo ""
    echo "📊 Optional Monitoring (run with --profile monitoring):"
    echo "   Kafka UI: http://localhost:8080"
    echo "   Redis Commander: http://localhost:8081"
    echo ""
    echo "🔧 Quick Commands:"
    echo "   View logs: docker-compose logs -f donut-bot"
    echo "   Stop: ./stop.sh"
    echo "   Restart: docker-compose restart donut-bot"
    echo ""
else
    echo "❌ Service health check failed"
    echo "📋 Checking logs..."
    docker-compose logs donut-bot
    exit 1
fi 