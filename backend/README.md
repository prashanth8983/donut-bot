# Donut Bot Backend

A modern, scalable web crawler backend built with FastAPI, featuring a modular architecture with comprehensive REST API control.

## Architecture

The backend follows a clean, layered architecture:

```
backend/
├── api/                    # API layer (HTTP endpoints)
│   └── v1/
│       ├── endpoints/      # Route handlers
│       └── router.py       # Main API router
├── core/                   # Core business logic
│   ├── crawler/           # Crawler engine components
│   ├── logger.py          # Logging configuration
│   └── utils.py           # Utility functions
├── db/                     # Database layer
│   ├── database.py        # Database connection
│   └── schemas.py         # Pydantic models
├── services/              # Service layer (business logic)
│   ├── crawler_service.py # Main crawler service
│   ├── url_service.py     # URL management
│   ├── config_service.py  # Configuration management
│   └── metrics_service.py # Metrics and monitoring
├── config.py              # Application configuration
├── exceptions.py          # Custom exceptions
└── main.py               # FastAPI application entry point
```

## API Endpoints

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

## Core Components

### Crawler Engine (`core/crawler/`)
- **engine.py** - Main crawler orchestration
- **scheduler.py** - URL scheduling and prioritization
- **url_frontier.py** - Redis-based URL queue management
- **downloader.py** - HTTP content downloading
- **content_extractor.py** - HTML parsing and content extraction
- **robots_checker.py** - robots.txt compliance
- **rate_limiter.py** - Request rate limiting
- **bloom_filter.py** - URL deduplication
- **metrics.py** - Performance metrics collection
- **url_utils.py** - URL normalization and validation
- **config.py** - Crawler configuration

### Services (`services/`)
- **crawler_service.py** - Main crawler service with lifecycle management
- **url_service.py** - URL queue operations
- **config_service.py** - Configuration management
- **metrics_service.py** - Metrics and statistics

## Features

- **Modular Architecture**: Clean separation of concerns with service layer
- **Redis Integration**: Scalable URL frontier with Redis
- **Bloom Filter**: Efficient URL deduplication
- **Rate Limiting**: Configurable request rate limiting
- **Robots.txt Compliance**: Respect for robots.txt files
- **Metrics Collection**: Comprehensive performance monitoring
- **REST API**: Full HTTP API for crawler control
- **Async/Await**: Non-blocking I/O operations
- **Error Handling**: Robust error handling and logging

## Getting Started

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Setup**:
   ```bash
   # Set up environment variables
   export REDIS_HOST=localhost
   export REDIS_PORT=6379
   export MONGODB_URL=mongodb://localhost:27017
   ```

3. **Start the Application**:
   ```bash
   python -m backend.main
   ```

4. **Access API Documentation**:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## API Usage Examples

### Start Crawler
```bash
curl -X POST "http://localhost:8000/api/v1/crawler/start" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "workers": 4,
      "max_depth": 3,
      "max_pages": 1000,
      "allowed_domains": ["example.com"]
    }
  }'
```

### Add URLs
```bash
curl -X POST "http://localhost:8000/api/v1/urls/add" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com",
      "https://example.com/page1"
    ]
  }'
```

### Get Status
```bash
curl "http://localhost:8000/api/v1/crawler/status"
```

### Get Metrics
```bash
curl "http://localhost:8000/api/v1/metrics"
```

## Configuration

The crawler supports extensive configuration options:

- **workers**: Number of concurrent workers
- **max_depth**: Maximum crawl depth
- **max_pages**: Maximum pages to crawl
- **default_delay**: Delay between requests
- **allowed_domains**: List of allowed domains
- **respect_robots_txt**: Whether to respect robots.txt
- **user_agent**: Custom user agent string

## Development

### Running Tests
```bash
pytest backend/tests/
```

### Code Formatting
```bash
black backend/
isort backend/
```

### Linting
```bash
flake8 backend/
```

## Deployment

The backend is containerized and can be deployed using Docker:

```bash
docker build -t donut-bot-backend .
docker run -p 8000:8000 donut-bot-backend
```

For production deployment, see the main project README for Docker Compose setup. 