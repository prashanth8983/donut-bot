FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/logs
RUN mkdir -p /app/crawler_output
RUN useradd -m -s /bin/bash crawler
RUN chown -R crawler:crawler /app
USER crawler

ENV PYTHONUNBUFFERED=1
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV LOG_LEVEL=INFO
ENV API_PORT=8089
ENV API_HOST=0.0.0.0
ENV PYTHONPATH=/app

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${API_PORT}/api/v1/health || exit 1

WORKDIR /app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8089"]