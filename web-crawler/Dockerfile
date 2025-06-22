FROM python:3.9-slim

RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY web_crawler.py .
COPY functions/ ./functions/

RUN mkdir -p /app/logs
RUN useradd -m -s /bin/bash crawler
RUN chown -R crawler:crawler /app
USER crawler

ENV PYTHONUNBUFFERED=1
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV LOG_LEVEL=DEBUG
ENV API_PORT=8089
ENV HEALTH_PORT=8089

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${HEALTH_PORT}/health || exit 1

CMD ["python", "web_crawler.py", \
  "--log-level", "DEBUG", \
  "--redis-host", "redis", \
  "--redis-port", "6379", \
  "--api-port", "8089", \
  "--enable-kafka-output", \
  "--no-enable-local-save", \
  "--seed-urls", "https://nyu.edu", \
  "--workers", "4", \
  "--max-pages", "4000", \
  "--no-respect-robots-txt", \
  "--allow-redirects"]