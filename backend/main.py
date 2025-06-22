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

from .config import settings
from .core.logger import get_logger
from .db.database import database, init_db
from .services.crawler_service import crawler_service
from .core.crawler.config import CrawlerConfig
from .api.v1.router import api_router

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting donut-bot backend...")
    
    try:
        # Initialize database
        await init_db()
        logger.info("Database initialized")
        
        # Initialize crawler service
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
            output_topic=settings.kafka_topic
        )
        await crawler_service.initialize(crawler_config)
        logger.info("Crawler service initialized successfully")
        
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
        
        # Disconnect from database
        await database.disconnect()
        logger.info("Database disconnected")
        
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


@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    logger.info("Starting Donut Bot API...")
    
    # Initialize database
    await init_db()
    logger.info("Database initialized")
    
    # Initialize crawler service
    await crawler_service.initialize()
    logger.info("Crawler service initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown."""
    logger.info("Shutting down Donut Bot API...")
    
    # Stop crawler if running
    if crawler_service.crawler_engine and crawler_service.crawler_engine.running:
        await crawler_service.stop_crawler()
        logger.info("Crawler stopped")
    
    logger.info("Shutdown complete")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
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
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 