"""
Main FastAPI application for donut-bot backend.
Entry point for the web crawler API.
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from config import settings
from core.logger import get_logger
from db.mongodb import mongodb_client
from services.crawler_service import crawler_service
from services.scheduler_service import get_scheduler_service, close_scheduler_service
from services.kafka_service import close_kafka_service
from services.file_storage_service import close_file_storage_service
from core.crawler.config import CrawlerConfig
from api.v1.router import api_router

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting donut-bot backend...")
    
    try:
        # Initialize database (optional for local development)
        try:
            await mongodb_client.connect()
            logger.info("MongoDB client connected")
        except Exception as e:
            logger.warning(f"MongoDB connection failed (continuing without MongoDB): {e}")
        
        # Initialize crawler service (optional for local development)
        try:
            crawler_config = CrawlerConfig(
                redis_host=settings.redis_host,
                redis_port=settings.redis_port,
                redis_db=settings.redis_db,
                workers=settings.default_workers,
                max_depth=settings.default_max_depth,
                max_pages=settings.default_max_pages,
                default_delay=settings.default_delay,
                allowed_domains=settings.default_allowed_domains,
                kafka_brokers=settings.kafka_brokers,
                output_topic=settings.kafka_topic,
                enable_kafka_output=settings.enable_kafka_output,
                enable_local_save=settings.enable_local_save,
                local_output_dir=settings.local_output_dir
            )
            await crawler_service.initialize(crawler_config, mongodb_client)
            # Don't automatically start the crawler - it should only start when a job is created
            logger.info("Crawler service initialized successfully (not started automatically)")
        except Exception as e:
            logger.warning(f"Crawler service initialization failed (continuing without crawler): {e}")
        
        # Initialize scheduler service
        try:
            await get_scheduler_service()
            logger.info("Scheduler service initialized successfully")
        except Exception as e:
            logger.warning(f"Scheduler service initialization failed (continuing without scheduler): {e}")
        
        logger.info("Backend startup completed successfully")
        
    except Exception as e:
        logger.error(f"Backend startup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down donut-bot backend...")
    
    try:
        # Stop crawler if running
        if crawler_service.crawler_engine and crawler_service.crawler_engine.running:
            await crawler_service.stop_crawler()
            logger.info("Crawler stopped")
        
        # Close crawler service
        try:
            await crawler_service.close()
            logger.info("Crawler service closed")
        except Exception as e:
            logger.warning(f"Error closing crawler service: {e}")
        
        # Close scheduler service
        try:
            await close_scheduler_service()
            logger.info("Scheduler service closed")
        except Exception as e:
            logger.warning(f"Error closing scheduler service: {e}")
        
        # Close Kafka service
        try:
            await close_kafka_service()
            logger.info("Kafka service closed")
        except Exception as e:
            logger.warning(f"Error closing Kafka service: {e}")
        
        # Close file storage service
        try:
            await close_file_storage_service()
            logger.info("File storage service closed")
        except Exception as e:
            logger.warning(f"Error closing file storage service: {e}")
        
        # Disconnect from database
        try:
            await mongodb_client.close()
            logger.info("MongoDB client closed")
        except Exception as e:
            logger.warning(f"Error disconnecting from MongoDB: {e}")
        
        logger.info("Backend shutdown completed successfully")
        
    except Exception as e:
        logger.error(f"Backend shutdown error: {e}")


# Create FastAPI application
app = FastAPI(
    title="Donut Bot API",
    description="A modern web crawler with REST API control",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Donut Bot API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    ) 