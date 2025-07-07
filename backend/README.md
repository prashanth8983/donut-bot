# Donut Bot Backend

A modern, scalable web crawler backend built with FastAPI, featuring a modular architecture with comprehensive REST API control, job management, scheduling, and real-time monitoring.

## Architecture

The backend follows a clean, layered architecture:

```
backend/
├── api/                    # API layer (HTTP endpoints)
│   └── v1/
│       ├── endpoints/      # Route handlers
│       │   ├── crawler.py  # Crawler control endpoints
│       │   ├── jobs.py     # Job management endpoints
│       │   ├── scheduler.py # Scheduled job endpoints
│       │   ├── urls.py     # URL management endpoints
│       │   ├── config.py   # Configuration endpoints
│       │   ├── metrics.py  # Metrics endpoints
│       │   └── health.py   # Health check endpoints
│       └── router.py       # Main API router
├── core/                   # Core business logic
│   ├── crawler/           # Crawler engine components
│   │   ├── engine.py      # Main crawler orchestration
│   │   ├── scheduler.py   # URL scheduling and prioritization
│   │   ├── url_frontier.py # Redis-based URL queue management
│   │   ├── downloader.py  # HTTP content downloading
│   │   ├── content_extractor.py # HTML parsing and content extraction
│   │   ├── robots_checker.py # robots.txt compliance
│   │   ├── rate_limiter.py # Request rate limiting
│   │   ├── bloom_filter.py # URL deduplication
│   │   ├── metrics.py     # Performance metrics collection
│   │   ├── url_utils.py   # URL normalization and validation
│   │   └── config.py      # Crawler configuration
│   ├── logger.py          # Logging configuration
│   └── utils.py           # Utility functions
├── db/                     # Database layer
│   ├── database.py        # Database connection
│   ├── mongodb.py         # MongoDB operations
│   └── schemas.py         # Pydantic models
├── services/              # Service layer (business logic)
│   ├── crawler_service.py # Main crawler service
│   ├── job_service.py     # Job management service
│   ├── scheduler_service.py # Scheduled job service
│   ├── url_service.py     # URL management service
│   ├── config_service.py  # Configuration management
│   ├── metrics_service.py # Metrics and monitoring
│   ├── file_storage_service.py # File storage operations
│   └── kafka_service.py   # Kafka messaging service
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

### Job Management
- `POST /api/v1/jobs/` - Create a new crawl job
- `GET /api/v1/jobs/` - Get jobs with filtering and pagination
- `GET /api/v1/jobs/{job_id}` - Get a specific job by ID
- `PUT /api/v1/jobs/{job_id}` - Update a job
- `DELETE /api/v1/jobs/{job_id}` - Delete a job
- `POST /api/v1/jobs/{job_id}/start` - Start a specific job
- `POST /api/v1/jobs/{job_id}/stop` - Stop a specific job
- `POST /api/v1/jobs/{job_id}/pause` - Pause a specific job
- `POST /api/v1/jobs/{job_id}/resume` - Resume a paused job
- `GET /api/v1/jobs/stats/overview` - Get job statistics overview

### Scheduled Jobs
- `POST /api/v1/scheduler/jobs` - Create a new scheduled job
- `GET /api/v1/scheduler/jobs` - Get scheduled jobs with filtering
- `GET /api/v1/scheduler/jobs/{job_id}` - Get a specific scheduled job
- `PUT /api/v1/scheduler/jobs/{job_id}` - Update a scheduled job
- `DELETE /api/v1/scheduler/jobs/{job_id}` - Delete a scheduled job
- `POST /api/v1/scheduler/jobs/{job_id}/enable` - Enable a scheduled job
- `POST /api/v1/scheduler/jobs/{job_id}/disable` - Disable a scheduled job
- `GET /api/v1/scheduler/next-runs` - Get upcoming scheduled job runs

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
- `GET /api/v1/metrics/{time_range}` - Get metrics for specific time range
- `GET /api/v1/stats` - Get comprehensive statistics

### Health & Status
- `GET /api/v1/health/` - Basic health check
- `GET /api/v1/health/detailed` - Detailed health check with database status
- `GET /api/v1/health/status` - Service status with uptime
- `GET /api/v1/health/ready` - Readiness probe
- `GET /api/v1/health/live` - Liveness probe
- `GET /api/v1/health/metrics` - Health metrics

## Core Components

### Crawler Engine (`core/crawler/`)
- **engine.py** - Main crawler orchestration with job-based execution
- **scheduler.py** - URL scheduling and prioritization
- **url_frontier.py** - Redis-based URL queue management
- **downloader.py** - HTTP content downloading with retry logic
- **content_extractor.py** - HTML parsing and content extraction
- **robots_checker.py** - robots.txt compliance checking
- **rate_limiter.py** - Configurable request rate limiting
- **bloom_filter.py** - URL deduplication using bloom filters
- **metrics.py** - Performance metrics collection and aggregation
- **url_utils.py** - URL normalization and validation utilities
- **config.py** - Crawler configuration management

### Services (`services/`)
- **crawler_service.py** - Main crawler service with lifecycle management
- **job_service.py** - Job management with CRUD operations and state transitions
- **scheduler_service.py** - Scheduled job management with cron expressions
- **url_service.py** - URL queue operations and management
- **config_service.py** - Configuration management and validation
- **metrics_service.py** - Metrics collection, aggregation, and reporting
- **file_storage_service.py** - File storage operations for crawled content
- **kafka_service.py** - Kafka messaging for event streaming

### Database Layer (`db/`)
- **database.py** - Database connection and session management
- **mongodb.py** - MongoDB-specific operations and utilities
- **schemas.py** - Pydantic models for data validation and serialization

## Features

### Core Crawler Features
- **Modular Architecture**: Clean separation of concerns with service layer
- **Redis Integration**: Scalable URL frontier with Redis for distributed crawling
- **Bloom Filter**: Efficient URL deduplication using bloom filters
- **Rate Limiting**: Configurable request rate limiting per domain
- **Robots.txt Compliance**: Respect for robots.txt files and crawling policies
- **Metrics Collection**: Comprehensive performance monitoring and analytics
- **REST API**: Full HTTP API for crawler control and monitoring
- **Async/Await**: Non-blocking I/O operations for high performance

### Job Management
- **Job Lifecycle**: Complete job lifecycle management (create, start, pause, resume, stop, delete)
- **Job Scheduling**: Cron-based job scheduling with flexible timing
- **Job Prioritization**: Priority-based job execution
- **Job Filtering**: Advanced filtering by status, priority, domain, and scheduling
- **Job Statistics**: Comprehensive job statistics and performance metrics

### Advanced Features
- **Kafka Integration**: Event streaming for real-time data processing
- **File Storage**: Configurable file storage for crawled content
- **Health Monitoring**: Comprehensive health checks and monitoring
- **Error Handling**: Robust error handling with detailed logging
- **Configuration Management**: Dynamic configuration updates
- **Pagination**: Efficient pagination for large datasets
- **Filtering**: Advanced filtering and search capabilities

## Getting Started

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Setup**:
   Sensitive configurations should be provided via environment variables. Refer to `backend/config.py` for a full list of configurable environment variables.
   ```bash
   # Database configuration
   export MONGO_URI="mongodb://user:password@host:port/database?authSource=admin"
   export REDIS_HOST="localhost"
   export REDIS_PORT="6379"
   
   # Application configuration
   export SECRET_KEY="your-super-secret-key"
   export DEBUG="false"
   
   # Optional: Kafka configuration
   export KAFKA_BROKERS="localhost:9092"
   export KAFKA_TOPIC="crawler-events"
   
   # Optional: File storage configuration
   export STORAGE_PATH="/path/to/storage"
   export STORAGE_TYPE="local"  # or "s3"
   ```

3. **Start the Application**:
   ```bash
   python -m backend.main
   ```

4. **Access API Documentation**:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## API Usage Examples

### Create and Start a Job
```bash
# Create a new job
curl -X POST "http://localhost:8000/api/v1/jobs/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Crawl Job",
    "description": "Crawl example.com",
    "config": {
      "workers": 4,
      "max_depth": 3,
      "max_pages": 1000,
      "allowed_domains": ["example.com"]
    },
    "priority": "normal"
  }'

# Start the job
curl -X POST "http://localhost:8000/api/v1/jobs/{job_id}/start"
```

### Create a Scheduled Job
```bash
curl -X POST "http://localhost:8000/api/v1/scheduler/jobs" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Crawl",
    "description": "Daily crawl of example.com",
    "cron_expression": "0 2 * * *",
    "config": {
      "workers": 2,
      "max_depth": 2,
      "max_pages": 500,
      "allowed_domains": ["example.com"]
    },
    "enabled": true
  }'
```

### Add URLs to Queue
```bash
curl -X POST "http://localhost:8000/api/v1/urls/add" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com",
      "https://example.com/page1",
      "https://example.com/page2"
    ]
  }'
```

### Get Job Statistics
```bash
curl "http://localhost:8000/api/v1/jobs/stats/overview"
```

### Get Detailed Health Status
```bash
curl "http://localhost:8000/api/v1/health/detailed"
```

### Get Metrics for Different Time Ranges
```bash
# 24-hour metrics
curl "http://localhost:8000/api/v1/metrics/24h"

# 7-day metrics
curl "http://localhost:8000/api/v1/metrics/7d"

# All-time metrics
curl "http://localhost:8000/api/v1/metrics/all"
```

## Configuration

The crawler supports extensive configuration options:

### Crawler Configuration
- **workers**: Number of concurrent workers
- **max_depth**: Maximum crawl depth
- **max_pages**: Maximum pages to crawl
- **default_delay**: Delay between requests (seconds)
- **allowed_domains**: List of allowed domains
- **respect_robots_txt**: Whether to respect robots.txt
- **user_agent**: Custom user agent string
- **timeout**: Request timeout (seconds)
- **retry_attempts**: Number of retry attempts for failed requests

### Job Configuration
- **priority**: Job priority (low, normal, high, critical)
- **scheduled**: Whether the job is scheduled
- **cron_expression**: Cron expression for scheduled jobs
- **enabled**: Whether the job is enabled

### Storage Configuration
- **storage_type**: Storage type (local, s3)
- **storage_path**: Local storage path
- **s3_bucket**: S3 bucket name (if using S3)
- **s3_region**: S3 region (if using S3)

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

### Type Checking
```bash
mypy backend/
```

## Deployment

The backend is containerized and can be deployed using Docker:

```bash
docker build -t donut-bot-backend .
docker run -p 8000:8000 donut-bot-backend
```

For production deployment with all services (MongoDB, Redis, Kafka), see the main project README for Docker Compose setup.

### Production Considerations
- Use environment variables for all sensitive configuration
- Set up proper logging and monitoring
- Configure health checks for load balancers
- Use Redis clustering for high availability
- Set up MongoDB replica sets for data durability
- Configure Kafka for event streaming
- Use proper SSL/TLS certificates
- Set up rate limiting and security headers 