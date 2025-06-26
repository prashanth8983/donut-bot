"""
Metrics API endpoints.
Handles HTTP requests for monitoring and metrics operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from services.metrics_service import get_metrics_service, MetricsService
from core.logger import get_logger

logger = get_logger("metrics_api")
router = APIRouter()


@router.get("/")
async def get_metrics(
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get crawler metrics."""
    try:
        metrics = await metrics_service.get_metrics()
        return metrics
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/stats")
async def get_statistics(
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get comprehensive statistics."""
    try:
        stats = await metrics_service.get_statistics()
        return stats
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("", include_in_schema=False)
async def get_metrics_no_slash(metrics_service: MetricsService = Depends(get_metrics_service)):
    return await get_metrics(metrics_service)


@router.get("/stats/", include_in_schema=False)
async def get_statistics_slash(metrics_service: MetricsService = Depends(get_metrics_service)):
    return await get_statistics(metrics_service) 