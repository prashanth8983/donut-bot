"""
Health check API endpoints.
Provides health and status information for the application.
"""

import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ....db.database import Database, get_database
from ....core.logger import get_logger

logger = get_logger("health_api")
router = APIRouter()

# Response models for better API documentation
class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str

class DetailedHealthResponse(BaseModel):
    status: str
    service: str
    database: str
    timestamp: str
    response_time_ms: float
    checks: Dict[str, Any]

class StatusResponse(BaseModel):
    service: str
    version: str
    status: str
    uptime_seconds: Optional[float] = None
    timestamp: str

# Global variable to track service start time
_service_start_time = datetime.now(timezone.utc)


def get_current_timestamp() -> str:
    """Get current timestamp in ISO format."""
    return datetime.now(timezone.utc).isoformat()


def calculate_uptime() -> float:
    """Calculate service uptime in seconds."""
    return (datetime.now(timezone.utc) - _service_start_time).total_seconds()


async def check_database_health(db: Database, timeout_seconds: float = 5.0) -> Dict[str, Any]:
    """
    Check database health with timeout and detailed diagnostics.
    
    Args:
        db: Database instance
        timeout_seconds: Timeout for database operations
    
    Returns:
        Dictionary with health check results
    """
    start_time = datetime.now(timezone.utc)
    result = {
        "status": "unknown",
        "response_time_ms": 0.0,
        "error": None,
        "details": {}
    }
    
    try:
        # Check if database client is available
        if not db.client:
            result.update({
                "status": "unhealthy",
                "error": "Database client not initialized",
                "response_time_ms": 0.0
            })
            return result
        
        # Test basic connectivity with timeout
        ping_task = db.client.admin.command('ping')
        await asyncio.wait_for(ping_task, timeout=timeout_seconds)
        
        # Calculate response time
        end_time = datetime.now(timezone.utc)
        response_time = (end_time - start_time).total_seconds() * 1000
        
        # Additional database checks
        server_info = await asyncio.wait_for(
            db.client.admin.command('serverStatus'), 
            timeout=timeout_seconds
        )
        
        result.update({
            "status": "healthy",
            "response_time_ms": round(response_time, 2),
            "details": {
                "server_version": server_info.get("version", "unknown"),
                "uptime_seconds": server_info.get("uptime", 0),
                "connections": server_info.get("connections", {}).get("current", 0)
            }
        })
        
    except asyncio.TimeoutError:
        result.update({
            "status": "unhealthy",
            "error": f"Database timeout after {timeout_seconds}s",
            "response_time_ms": timeout_seconds * 1000
        })
        logger.error(f"Database health check timed out after {timeout_seconds}s")
        
    except Exception as e:
        end_time = datetime.now(timezone.utc)
        response_time = (end_time - start_time).total_seconds() * 1000
        
        result.update({
            "status": "unhealthy",
            "error": str(e),
            "response_time_ms": round(response_time, 2)
        })
        logger.error(f"Database health check failed: {e}")
    
    return result


@router.get("/", response_model=HealthResponse)
async def health_check():
    """
    Basic health check endpoint.
    
    Returns basic service health status without external dependencies.
    This should always return quickly and be used by load balancers.
    """
    return HealthResponse(
        status="healthy",
        service="donut-bot-api",
        timestamp=get_current_timestamp()
    )


@router.get("/detailed", response_model=DetailedHealthResponse)
async def detailed_health_check(db: Database = Depends(get_database)):
    """
    Detailed health check including database connectivity and performance metrics.
    
    Performs comprehensive checks of all service dependencies.
    May take longer than basic health check due to external service calls.
    """
    start_time = datetime.now(timezone.utc)
    
    # Perform database health check
    db_health = await check_database_health(db)
    
    # Calculate total response time
    end_time = datetime.now(timezone.utc)
    total_response_time = (end_time - start_time).total_seconds() * 1000
    
    # Determine overall status
    overall_status = "healthy"
    if db_health["status"] == "unhealthy":
        overall_status = "degraded"
    
    # Prepare detailed response
    checks = {
        "database": db_health,
        "uptime_seconds": calculate_uptime()
    }
    
    response = DetailedHealthResponse(
        status=overall_status,
        service="donut-bot-api",
        database=db_health["status"],
        timestamp=get_current_timestamp(),
        response_time_ms=round(total_response_time, 2),
        checks=checks
    )
    
    # Log health check results
    logger.info(f"Detailed health check completed: status={overall_status}, "
               f"db={db_health['status']}, response_time={total_response_time:.2f}ms")
    
    # Return appropriate HTTP status code
    if overall_status == "degraded":
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response.model_dump()
        )
    
    return response


@router.get("/status", response_model=StatusResponse)
async def status_check():
    """
    Application status endpoint with version and runtime information.
    
    Provides static information about the service including version,
    uptime, and current operational status.
    """
    try:
        # Get settings for version info
        version = "1.0.0"  # Fallback version
        logger.warning("Could not retrieve version from settings, using fallback")
    except Exception:
        version = "1.0.0"  # Fallback version
        logger.warning("Could not retrieve version from settings, using fallback")
    
    return StatusResponse(
        service="donut-bot-api",
        version=version,
        status="running",
        uptime_seconds=round(calculate_uptime(), 2),
        timestamp=get_current_timestamp()
    )


@router.get("/ready")
async def readiness_check(db: Database = Depends(get_database)):
    """
    Kubernetes-style readiness probe.
    
    Checks if the service is ready to handle requests.
    Returns 200 if ready, 503 if not ready.
    """
    try:
        # Check if database client is available
        if not db.client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "not_ready",
                    "service": "donut-bot-api",
                    "error": "Database client not initialized",
                    "timestamp": get_current_timestamp()
                }
            )
        
        # Quick database connectivity check
        await asyncio.wait_for(
            db.client.admin.command('ping'), 
            timeout=2.0
        )
        
        return {
            "status": "ready",
            "service": "donut-bot-api",
            "timestamp": get_current_timestamp()
        }
        
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "not_ready",
                "service": "donut-bot-api",
                "error": str(e),
                "timestamp": get_current_timestamp()
            }
        )


@router.get("/live")
async def liveness_check():
    """
    Kubernetes-style liveness probe.
    
    Checks if the service is alive and responding.
    This should be lightweight and not depend on external services.
    """
    return {
        "status": "alive",
        "service": "donut-bot-api",
        "uptime_seconds": round(calculate_uptime(), 2),
        "timestamp": get_current_timestamp()
    }


@router.get("/metrics")
async def health_metrics(db: Database = Depends(get_database)):
    """
    Health metrics endpoint for monitoring systems.
    
    Provides detailed metrics that can be consumed by monitoring
    tools like Prometheus, DataDog, etc.
    """
    start_time = datetime.now(timezone.utc)
    
    try:
        # Collect various health metrics
        db_health = await check_database_health(db, timeout_seconds=3.0)
        
        # Calculate response time for this endpoint
        end_time = datetime.now(timezone.utc)
        endpoint_response_time = (end_time - start_time).total_seconds() * 1000
        
        metrics = {
            "service": "donut-bot-api",
            "timestamp": get_current_timestamp(),
            "uptime_seconds": calculate_uptime(),
            "database": {
                "status": db_health["status"],
                "response_time_ms": db_health["response_time_ms"],
                "details": db_health.get("details", {})
            },
            "endpoint_response_time_ms": round(endpoint_response_time, 2),
            "memory_usage": "unknown",  # Could integrate psutil here
            "cpu_usage": "unknown"      # Could integrate psutil here
        }
        
        return metrics
        
    except Exception as e:
        logger.error(f"Failed to collect health metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Failed to collect metrics",
                "details": str(e),
                "timestamp": get_current_timestamp()
            }
        )