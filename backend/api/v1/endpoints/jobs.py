"""
Jobs API endpoints.
Handles HTTP requests for job management operations.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from ....db.schemas import JobCreate, JobUpdate, JobResponse, JobListResponse, JobStats
from ....services.job_service import JobService
from ....exceptions import JobNotFoundError, JobAlreadyExistsError, InvalidJobStateError, DatabaseError
from ....core.logger import get_logger
from ...deps import get_job_service

logger = get_logger("jobs_api")
router = APIRouter()


@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    job_service: JobService = Depends(get_job_service)
):
    """Create a new crawl job."""
    try:
        job = await job_service.create_job(job_data)
        logger.info(f"Created job: {job.name} (ID: {job.id})")
        return job
    except DatabaseError as e:
        logger.error(f"Database error creating job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error creating job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/", response_model=JobListResponse)
async def get_jobs(
    job_status: Optional[str] = Query(None, description="Filter by job status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    scheduled: Optional[bool] = Query(None, description="Filter by scheduled status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(100, ge=1, le=1000, description="Page size"),
    job_service: JobService = Depends(get_job_service)
):
    """Get jobs with optional filtering and pagination."""
    try:
        jobs = await job_service.get_jobs(
            status=job_status,
            priority=priority,
            domain=domain,
            scheduled=scheduled,
            page=page,
            size=size
        )
        return jobs
    except DatabaseError as e:
        logger.error(f"Database error getting jobs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error getting jobs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    job_service: JobService = Depends(get_job_service)
):
    """Get a specific job by ID."""
    try:
        job = await job_service.get_job_by_id(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job not found: {job_id}"
            )
        return job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    job_data: JobUpdate,
    job_service: JobService = Depends(get_job_service)
):
    """Update a job."""
    try:
        job = await job_service.update_job(job_id, job_data)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job not found: {job_id}"
            )
        logger.info(f"Updated job: {job.name} (ID: {job_id})")
        return job
    except JobNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job not found: {job_id}"
        )
    except DatabaseError as e:
        logger.error(f"Database error updating job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error updating job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    job_service: JobService = Depends(get_job_service)
):
    """Delete a job."""
    try:
        success = await job_service.delete_job(job_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job not found: {job_id}"
            )
        logger.info(f"Deleted job: {job_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/{job_id}/start", status_code=status.HTTP_200_OK)
async def start_job(
    job_id: str,
    job_service: JobService = Depends(get_job_service)
):
    """Start a job."""
    try:
        success = await job_service.start_job(job_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job not found: {job_id}"
            )
        logger.info(f"Started job: {job_id}")
        return {"message": "Job started successfully"}
    except JobNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job not found: {job_id}"
        )
    except InvalidJobStateError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error starting job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/{job_id}/stop", status_code=status.HTTP_200_OK)
async def stop_job(
    job_id: str,
    job_service: JobService = Depends(get_job_service)
):
    """Stop a job."""
    try:
        success = await job_service.stop_job(job_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job not found: {job_id}"
            )
        logger.info(f"Stopped job: {job_id}")
        return {"message": "Job stopped successfully"}
    except InvalidJobStateError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error stopping job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/stats/overview", response_model=JobStats)
async def get_job_stats(
    job_service: JobService = Depends(get_job_service)
):
    """Get job statistics overview."""
    try:
        stats = await job_service.get_job_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting job stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 