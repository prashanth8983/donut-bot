# WebCrawler Pro - Full Stack Web Crawling Platform

A comprehensive web crawling platform with a modern React frontend, Python backend API, and MongoDB job management.

## 🏗️ Project Structure

```
donut-bot/
├── backend/                 # Python backend API
│   ├── donutbot/           # Core crawler modules
│   ├── web_crawler.py      # Main crawler implementation
│   ├── api_crawler.py      # API server entry point
│   ├── api_client_example.py
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile         # Backend container
│   ├── logs/              # Application logs
│   └── output/            # Crawled data output
├── frontend/               # React TypeScript frontend
│   ├── src/               # React source code
│   ├── public/            # Static assets
│   ├── package.json       # Node.js dependencies
│   └── Dockerfile         # Frontend container
├── config/                 # Configuration files
│   ├── docker-compose.yml # Docker orchestration
│   ├── mongo-init.js      # MongoDB initialization
│   └── nginx.conf         # Nginx configuration
├── scripts/                # Utility scripts
│   ├── start.sh           # Start all services
│   └── stop.sh            # Stop all services
├── docs/                   # Documentation
│   ├── README.md          # Detailed documentation
│   ├── DEPLOYMENT.md      # Deployment guide
│   └── LICENSE            # Project license
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Using Docker (Recommended)

1. **Start all services:**
   ```bash
   cd config
   docker-compose up --build
   ```

2. **Access the applications:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8089
   - Kafka UI: http://localhost:8080 (optional monitoring)
   - Redis Commander: http://localhost:8081 (optional monitoring)

### Local Development

1. **Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python api_crawler.py
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

## 🛠️ Features

### Backend API
- **RESTful API** for crawler control
- **MongoDB integration** for job management
- **Redis caching** and queue management
- **Kafka streaming** for data processing
- **Health monitoring** and metrics

### Frontend Dashboard
- **Real-time monitoring** of crawler status
- **Job management** with create, start, pause, stop
- **Performance metrics** and analytics
- **Modern UI** with Tailwind CSS
- **TypeScript** for type safety

### Infrastructure
- **Docker containers** for easy deployment
- **MongoDB** for persistent job storage
- **Redis** for caching and queues
- **Kafka** for message streaming
- **Optional monitoring** with Kafka UI and Redis Commander

## 📚 Documentation

- [Detailed Documentation](docs/README.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [API Reference](docs/API.md)

## 🔧 Configuration

### Environment Variables
- `MONGO_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection string
- `KAFKA_BOOTSTRAP_SERVERS`: Kafka servers
- `API_HOST`: API server host
- `API_PORT`: API server port

### Docker Configuration
- [docker-compose.yml](config/docker-compose.yml) - Service orchestration
- [Dockerfile](backend/Dockerfile) - Backend container
- [Frontend Dockerfile](frontend/Dockerfile) - Frontend container

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](docs/LICENSE) file for details.

## 🆘 Support

For issues and questions:
1. Check the [documentation](docs/README.md)
2. Search existing issues
3. Create a new issue with detailed information

---

**Happy Crawling! 🕷️** 