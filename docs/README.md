# Donut Bot - API-Driven Web Crawler

A high-performance, asynchronous web crawler with a comprehensive REST API for complete programmatic control.

## 🚀 Features

- **Full API Control**: All functionality accessible via REST endpoints
- **Asynchronous Architecture**: High-performance concurrent crawling
- **Redis Integration**: Distributed URL frontier and state management
- **Bloom Filter**: Efficient duplicate URL detection
- **Rate Limiting**: Configurable per-domain rate limiting
- **Robots.txt Support**: Respects robots.txt files
- **Content Extraction**: Extracts titles, links, images, and metadata
- **Kafka Integration**: Stream crawled documents to Kafka
- **Local Storage**: Save crawled documents locally
- **Health Monitoring**: Comprehensive health checks and metrics
- **CORS Support**: Cross-origin request support
- **Docker Ready**: Containerized deployment

## 📋 API Endpoints

### Crawler Management
- `POST /api/v1/crawler/start` - Start the crawler with optional configuration
- `POST /api/v1/crawler/stop` - Stop the crawler
- `GET /api/v1/crawler/status` - Get comprehensive crawler status
- `POST /api/v1/crawler/reset` - Reset crawler state and data

### URL Management
- `POST /api/v1/urls/add` - Add URLs to the crawler queue
- `GET /api/v1/urls/queue` - Get URL queue status
- `DELETE /api/v1/urls/clear` - Clear URL queue and data

### Configuration Management
- `GET /api/v1/config` - Get current configuration
- `PUT /api/v1/config` - Update configuration
- `GET /api/v1/config/domains` - Get allowed domains
- `PUT /api/v1/config/domains` - Update allowed domains

### Monitoring & Metrics
- `GET /api/v1/metrics` - Get crawler metrics
- `GET /api/v1/stats` - Get comprehensive statistics
- `GET /api/v1/health` - Health check

## 🛠️ Installation

### Prerequisites
- Python 3.9+
- Redis server
- Kafka (optional, for document streaming)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/prashanth8983/donut-bot.git
   cd donut-bot
   ```

2. **Create virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start Redis**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:latest
   
   # Or install locally
   # brew install redis  # macOS
   # sudo apt-get install redis-server  # Ubuntu
   ```

## 🚀 Quick Start

### 1. Start the API Server

```bash
# Start the API server
python api_crawler.py --host 0.0.0.0 --port 8089 --log-level INFO
```

### 2. Use the API Client

```bash
# Run the example client
python api_client_example.py
```

### 3. Manual API Usage

```bash
# Start crawler
curl -X POST http://localhost:8089/api/v1/crawler/start \
  -H "Content-Type: application/json" \
  -d '{"config": {"workers": 2, "max_pages": 100}}'

# Add URLs
curl -X POST http://localhost:8089/api/v1/urls/add \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com"], "priority": 1.0, "depth": 0}'

# Get status
curl http://localhost:8089/api/v1/crawler/status

# Get metrics
curl http://localhost:8089/api/v1/metrics

# Stop crawler
curl -X POST http://localhost:8089/api/v1/crawler/stop
```

## 📖 API Reference

### Start Crawler
```http
POST /api/v1/crawler/start
Content-Type: application/json

{
  "config": {
    "workers": 3,
    "max_depth": 3,
    "max_pages": 1000,
    "default_delay": 1.0,
    "allowed_domains": ["example.com"],
    "respect_robots_txt": true,
    "allow_redirects": true
  }
}
```

### Add URLs
```http
POST /api/v1/urls/add
Content-Type: application/json

{
  "urls": ["https://example.com", "https://test.com"],
  "priority": 0.8,
  "depth": 0
}
```

### Update Configuration
```http
PUT /api/v1/config
Content-Type: application/json

{
  "workers": 5,
  "max_pages": 500,
  "default_delay": 0.5
}
```

### Update Allowed Domains
```http
PUT /api/v1/config/domains
Content-Type: application/json

{
  "action": "add",
  "domains": ["newdomain.com", "anotherdomain.org"]
}
```

## 🔧 Configuration

### Environment Variables
- `API_HOST` - API server host (default: 0.0.0.0)
- `API_PORT` - API server port (default: 8089)
- `LOG_LEVEL` - Logging level (default: INFO)
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `KAFKA_BROKERS` - Kafka brokers (default: localhost:9092)

### Configuration Options
- `workers` - Number of concurrent workers
- `max_depth` - Maximum crawl depth
- `max_pages` - Maximum pages to crawl (0 = unlimited)
- `default_delay` - Default delay between requests
- `allowed_domains` - List of allowed domains
- `respect_robots_txt` - Whether to respect robots.txt
- `allow_redirects` - Whether to follow redirects
- `enable_kafka_output` - Enable Kafka document streaming
- `enable_local_save` - Enable local document saving

## 🐳 Docker Deployment

### Build and Run
```bash
# Build the image
docker build -t donut-bot .

# Run with Redis
docker run -d --name redis redis:latest
docker run -d --name donut-bot --link redis \
  -p 8089:8089 \
  -e REDIS_HOST=redis \
  donut-bot
```

### Docker Compose
```yaml
version: '3.8'
services:
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
  
  donut-bot:
    build: .
    ports:
      - "8089:8089"
    environment:
      - REDIS_HOST=redis \
      - API_PORT=8089
    depends_on:
      - redis
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:8089/api/v1/health
```

### Metrics
```bash
curl http://localhost:8089/api/v1/metrics
```

### Statistics
```bash
curl http://localhost:8089/api/v1/stats
```

## 🔍 Examples

### Python Client
```python
import asyncio
from api_client_example import CrawlerAPIClient

async def main():
    async with CrawlerAPIClient() as client:
        # Start crawler
        await client.start_crawler({
            'workers': 3,
            'max_pages': 100
        })
        
        # Add URLs
        await client.add_urls(['https://example.com'], priority=1.0)
        
        # Monitor progress
        while True:
            status = await client.get_crawler_status()
            if not status['crawler_running']:
                break
            await asyncio.sleep(5)

asyncio.run(main())
```

### JavaScript Client
```javascript
const API_BASE = 'http://localhost:8089/api/v1';

// Start crawler
await fetch(`${API_BASE}/crawler/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        config: { workers: 2, max_pages: 50 }
    })
});

// Add URLs
await fetch(`${API_BASE}/urls/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        urls: ['https://example.com'],
        priority: 1.0
    })
});
```

## 🧪 Testing

### Run Basic Tests
```bash
python test_basic.py
```

### API Testing
```bash
# Test health endpoint
curl http://localhost:8089/api/v1/health

# Test configuration
curl http://localhost:8089/api/v1/config
```

## 📝 Logging

Logs are written to both console and file:
- Console: Real-time logging
- File: `api_crawler.log` (rotated automatically)

Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/prashanth8983/donut-bot/issues)
- **Documentation**: This README and inline code comments
- **Examples**: See `api_client_example.py` for comprehensive usage examples

## 🔄 Migration from Old Version

If you're migrating from the old `web_crawler.py`:

1. **Old way**: Direct instantiation and method calls
2. **New way**: API-driven control via REST endpoints

The old `web_crawler.py` is still available for backward compatibility, but the new API-driven approach is recommended for all new development.

---

**Happy Crawling! 🕷️**