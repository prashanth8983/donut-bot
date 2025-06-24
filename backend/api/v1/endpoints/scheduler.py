"""
Scheduler API endpoints.
Handles HTTP requests for scheduled job management operations.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from ....db.schemas import ScheduledJobCreate, ScheduledJobUpdate, ScheduledJobResponse, ScheduledJobListResponse, NextRunsResponse
from ....services.scheduler_service import get_scheduler_service, SchedulerService
from ....exceptions import JobNotFoundError, DatabaseError
from ....core.logger import get_logger

logger = get_logger("scheduler_api")
router = APIRouter()


@router.post("/jobs", response_model=ScheduledJobResponse, status_code=status.HTTP_201_CREATED)
async def create_scheduled_job(
    job_data: ScheduledJobCreate,
    scheduler_service: SchedulerService = Depends(get_scheduler_service)
):
    """Create a new scheduled job."""
    try:
        job = await scheduler_service.create_scheduled_job(job_data)
        logger.info(f"Created scheduled job: {job.name} (ID: {job.id})")
        return job
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(f"Database error creating scheduled job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error creating scheduled job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/jobs", response_model=ScheduledJobListResponse)
async def get_scheduled_jobs(
    status: Optional[str] = Query(None, description="Filter by job status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(100, ge=1, le=1000, description="Page size"),
    scheduler_service: SchedulerService = Depends(get_scheduler_service)
):
    """Get scheduled jobs with optional filtering and pagination."""
    try:
        jobs = await scheduler_service.get_scheduled_jobs(
            status=status,
            priority=priority,
            domain=domain,
            page=page,
            size=size
        )
        return jobs
    except DatabaseError as e:
        logger.error(f"Database error getting scheduled jobs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error getting scheduled jobs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/jobs/{job_id}", response_model=ScheduledJobResponse)
async def get_scheduled_job(
    job_id: str,
    scheduler_service: SchedulerService = Depends(get_scheduler_service)
):
    """Get a specific scheduled job by ID."""
    try:
        job = await scheduler_service.get_scheduled_job_by_id(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scheduled job not found: {job_id}"
            )
        return job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting scheduled job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.put("/jobs/{job_id}", response_model=ScheduledJobResponse)
async def update_scheduled_job(
    job_id: str,
    job_data: ScheduledJobUpdate,
    scheduler_service: SchedulerService = Depends(get_scheduler_service)
):
    """Update a scheduled job."""
    try:
        job = await scheduler_service.update_scheduled_job(job_id, job_data)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scheduled job not found: {job_id}"
            )
        logger.info(f"Updated scheduled job: {job.name} (ID: {job_id})")
        return job
    except JobNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scheduled job not found: {job_id}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(f"Database error updating scheduled job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error updating scheduled job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scheduled_job(
    job_id: str,
    scheduler_service: SchedulerService = Depends(get_scheduler_service)
):
    """Delete a scheduled job."""
    try:
        success = await scheduler_service.delete_scheduled_job(job_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scheduled job not found: {job_id}"
            )
        logger.info(f"Deleted scheduled job: {job_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting scheduled job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/jobs/{job_id}/enable", status_code=status.HTTP_200_OK)
async def enable_scheduled_job(
    job_id: str,
    scheduler_service: SchedulerService = Depends(get_scheduler_service)
):
    """Enable a scheduled job."""
    try:
        success = await scheduler_service.enable_scheduled_job(job_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scheduled job not found: {job_id}"
            )
        logger.info(f"Enabled scheduled job: {job_id}")
        return {"message": "Scheduled job enabled successfully"}
    except JobNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scheduled job not found: {job_id}"
        )
    except Exception as e:
        logger.error(f"Error enabling scheduled job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/jobs/{job_id}/disable", status_code=status.HTTP_200_OK)
async def disable_scheduled_job(
    job_id: str,
    scheduler_service: SchedulerService = Depends(get_scheduler_service)
):
    """Disable a scheduled job."""
    try:
        success = await scheduler_service.disable_scheduled_job(job_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scheduled job not found: {job_id}"
            )
        logger.info(f"Disabled scheduled job: {job_id}")
        return {"message": "Scheduled job disabled successfully"}
    except JobNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scheduled job not found: {job_id}"
        )
    except Exception as e:
        logger.error(f"Error disabling scheduled job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/next-runs", response_model=NextRunsResponse)
async def get_next_runs(
    limit: int = Query(10, ge=1, le=50, description="Number of next runs to return"),
    scheduler_service: SchedulerService = Depends(get_scheduler_service)
):
    """Get the next scheduled runs."""
    try:
        next_runs = await scheduler_service.get_next_runs(limit)
        return {
            "next_runs": next_runs,
            "count": len(next_runs)
        }
    except Exception as e:
        logger.error(f"Error getting next runs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 