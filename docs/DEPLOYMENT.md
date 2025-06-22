# 🐳 Docker Compose Deployment Guide

This guide explains how to deploy the Donut Bot web crawler using Docker Compose with all its dependencies.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- 10GB free disk space

## 🚀 Quick Start

### 1. **Basic Deployment (Core Services)**
```bash
# Start core services (Redis, Kafka, Zookeeper, Web Crawler)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f donut-bot
```

### 2. **With Monitoring (Optional)**
```bash
# Start with monitoring tools (Kafka UI, Redis Commander)
docker-compose --profile monitoring up -d

# Access monitoring tools:
# - Kafka UI: http://localhost:8080
# - Redis Commander: http://localhost:8081
```

### 3. **Production Deployment**
```bash
# Start with nginx reverse proxy
docker-compose --profile production up -d

# Access via nginx:
# - API: http://localhost/api/v1/
# - Health: http://localhost/health
```

## 🔧 Service Configuration

### **Core Services**

| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| `redis` | 6379 | URL frontier & state | `redis-cli ping` |
| `zookeeper` | 2181 | Kafka coordination | `echo ruok \| nc localhost 2181` |
| `kafka` | 9092 | Document streaming | `kafka-topics --list` |
| `donut-bot` | 8089 | Web crawler API | `curl /api/v1/health` |

### **Optional Services**

| Service | Port | Purpose | Profile |
|---------|------|---------|---------|
| `kafka-ui` | 8080 | Kafka monitoring | `monitoring` |
| `redis-commander` | 8081 | Redis monitoring | `monitoring` |
| `nginx` | 80/443 | Reverse proxy | `production` |

## 🌐 Access Points

### **API Endpoints**
```bash
# Direct API access
curl http://localhost:8089/api/v1/health

# Via nginx (production)
curl http://localhost/api/v1/health
```

### **Monitoring Dashboards**
```bash
# Kafka UI (if monitoring profile enabled)
open http://localhost:8080

# Redis Commander (if monitoring profile enabled)
open http://localhost:8081
```

## 🔍 Health Checks

### **Check All Services**
```bash
# Check service status
docker-compose ps

# Check health status
docker-compose exec donut-bot curl -f http://localhost:8089/api/v1/health
```

### **Individual Service Checks**
```bash
# Redis
docker-compose exec redis redis-cli ping

# Kafka
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# Zookeeper
docker-compose exec zookeeper echo ruok | nc localhost 2181
```

## 📊 Monitoring & Logs

### **View Logs**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f donut-bot
docker-compose logs -f redis
docker-compose logs -f kafka
```

### **Resource Usage**
```bash
# Check resource usage
docker stats

# Check disk usage
docker system df
```

## ⚙️ Configuration

### **Environment Variables**

Create a `.env` file for custom configuration:

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8089
LOG_LEVEL=INFO

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# Kafka Configuration
KAFKA_BROKERS=kafka:29092
OUTPUT_TOPIC=raw-documents
ENABLE_KAFKA_OUTPUT=true

# Crawler Configuration
WORKERS=3
MAX_DEPTH=3
MAX_PAGES=1000
DEFAULT_DELAY=1.0
ALLOWED_DOMAINS=example.com,test.com
```

### **Custom Configuration**

Modify `docker-compose.yml` for your needs:

```yaml
services:
  donut-bot:
    environment:
      WORKERS: 5  # Increase workers
      MAX_PAGES: 5000  # Increase page limit
      ALLOWED_DOMAINS: "yourdomain.com,anotherdomain.org"
```

## 🔄 Scaling

### **Scale Workers**
```bash
# Scale the crawler service
docker-compose up -d --scale donut-bot=3
```

### **Scale Kafka**
```bash
# Add more Kafka brokers (requires configuration changes)
docker-compose up -d --scale kafka=3
```

## 🛠️ Troubleshooting

### **Common Issues**

1. **Port Conflicts**
   ```bash
   # Check what's using the ports
   lsof -i :8089
   lsof -i :6379
   lsof -i :9092
   ```

2. **Service Won't Start**
   ```bash
   # Check logs
   docker-compose logs donut-bot
   
   # Restart service
   docker-compose restart donut-bot
   ```

3. **Health Check Failures**
   ```bash
   # Check service health
   docker-compose ps
   
   # Manual health check
   docker-compose exec donut-bot curl http://localhost:8089/api/v1/health
   ```

### **Data Persistence**

Data is persisted in Docker volumes:
```bash
# List volumes
docker volume ls

# Backup data
docker run --rm -v donut-bot_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .

# Restore data
docker run --rm -v donut-bot_redis_data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup.tar.gz -C /data
```

## 🧹 Maintenance

### **Cleanup**
```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Full cleanup
docker system prune -a --volumes
```

### **Updates**
```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

## 🔒 Security

### **Production Security**
1. **Change default passwords**
2. **Use SSL/TLS certificates**
3. **Configure firewall rules**
4. **Enable authentication**
5. **Regular security updates**

### **SSL Configuration**
```bash
# Generate SSL certificates
mkdir ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem

# Uncomment HTTPS section in nginx.conf
# Restart with production profile
docker-compose --profile production up -d
```

## 📈 Performance Tuning

### **Resource Limits**
```yaml
services:
  donut-bot:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### **Optimization Tips**
- Increase `WORKERS` based on CPU cores
- Adjust `MAX_PAGES` based on memory
- Tune Redis memory settings
- Configure Kafka retention policies

## 🚀 Deployment Scripts

### **Start Script**
```bash
#!/bin/bash
# start.sh

echo "Starting Donut Bot with Docker Compose..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running"
    exit 1
fi

# Start services
docker-compose up -d

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 30

# Check health
if curl -f http://localhost:8089/api/v1/health > /dev/null 2>&1; then
    echo "✅ Donut Bot is ready!"
    echo "🌐 API: http://localhost:8089/api/v1/"
    echo "📊 Health: http://localhost:8089/api/v1/health"
else
    echo "❌ Service health check failed"
    docker-compose logs donut-bot
    exit 1
fi
```

### **Stop Script**
```bash
#!/bin/bash
# stop.sh

echo "Stopping Donut Bot..."

docker-compose down

echo "✅ Donut Bot stopped"
```

Make scripts executable:
```bash
chmod +x start.sh stop.sh
```

---

**Happy Deploying! 🐳** 