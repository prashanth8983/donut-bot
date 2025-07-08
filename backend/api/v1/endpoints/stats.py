"""
Stats API endpoints.
Handles HTTP requests for general statistics and overview data.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from services.metrics_service import get_metrics_service, MetricsService
from services.job_service import JobService
from services.scheduler_service import SchedulerService
from services.file_storage_service import get_file_storage_service, FileStorageService
from api.deps import get_job_service, get_scheduler_service
from core.logger import get_logger

logger = get_logger("stats_api")
router = APIRouter()


@router.get("/")
async def get_stats(
    metrics_service: MetricsService = Depends(get_metrics_service),
    job_service: JobService = Depends(get_job_service),
    scheduler_service: SchedulerService = Depends(get_scheduler_service),
    file_storage_service: FileStorageService = Depends(get_file_storage_service)
):
    """Get comprehensive system statistics."""
    try:
        # Get metrics
        metrics = await metrics_service.get_metrics()
        
        # Get job stats
        job_stats = await job_service.get_job_stats()
        
        # Get scheduler stats (get next runs as a proxy for scheduler stats)
        next_runs = await scheduler_service.get_next_runs(limit=10)
        scheduler_stats = {
            "total_scheduled_jobs": len(next_runs),
            "next_runs": next_runs
        }
        
        # Get file storage stats
        storage_stats = await file_storage_service.get_storage_stats()
        
        # Get results stats
        results_stats = await file_storage_service.get_results_stats()
        
        # Combine all stats
        combined_stats = {
            "metrics": metrics,
            "jobs": job_stats,
            "scheduler": scheduler_stats,
            "storage": storage_stats,
            "results": results_stats,
            "system": {
                "total_jobs": job_stats.total_jobs,
                "active_jobs": job_stats.running.count,
                "completed_jobs": job_stats.completed.count,
                "scheduled_jobs": scheduler_stats.get("total_scheduled_jobs", 0),
                "total_results": results_stats.get("total_results", 0),
                "total_storage_mb": storage_stats.get("total_size_mb", 0)
            }
        }
        
        return combined_stats
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/", include_in_schema=False)
async def get_stats_no_slash(
    metrics_service: MetricsService = Depends(get_metrics_service),
    job_service: JobService = Depends(get_job_service),
    scheduler_service: SchedulerService = Depends(get_scheduler_service),
    file_storage_service: FileStorageService = Depends(get_file_storage_service)
):
    return await get_stats(metrics_service, job_service, scheduler_service, file_storage_service) 