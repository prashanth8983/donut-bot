#!/bin/bash

echo "🛑 Stopping Donut Bot..."

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found"
    exit 1
fi

# Stop all services
docker-compose down

echo "✅ Donut Bot stopped"
echo ""
echo "🧹 To remove all data (volumes), run:"
echo "   docker-compose down -v"
echo ""
echo "🔄 To restart, run:"
echo "   ./start.sh" 