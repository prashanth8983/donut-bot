"""
Health check API endpoints.
Provides health and status information for the application.
"""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from ....db.database import Database, get_database
from ....core.logger import get_logger

logger = get_logger("health_api")
router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "healthy", "service": "donut-bot-api"}


@router.get("/health/detailed")
async def detailed_health_check(db: Database = Depends(get_database)):
    """Detailed health check including database connectivity."""
    try:
        # Test database connection
        await db.client.admin.command('ping')
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "donut-bot-api",
        "database": db_status,
        "timestamp": "2025-06-22T17:20:00.000000"
    }


@router.get("/status")
async def status_check():
    """Application status endpoint."""
    return {
        "service": "donut-bot-api",
        "version": "1.0.0",
        "status": "running"
    } 