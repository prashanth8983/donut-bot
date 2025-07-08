"""
Results API endpoints.
Handles HTTP requests for crawl results and data retrieval.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from services.file_storage_service import get_file_storage_service, FileStorageService
from core.logger import get_logger

logger = get_logger("results_api")
router = APIRouter()


@router.get("/")
async def get_results(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(100, ge=1, le=1000, description="Page size"),
    job_id: Optional[str] = Query(None, description="Filter by job ID"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    file_storage_service: FileStorageService = Depends(get_file_storage_service)
):
    """Get crawl results with optional filtering and pagination."""
    try:
        results = await file_storage_service.get_results(
            page=page,
            size=size,
            job_id=job_id,
            domain=domain
        )
        return {
            "results": results.get("data", []),
            "total": results.get("total", 0),
            "page": page,
            "size": size,
            "pages": results.get("pages", 0)
        }
    except Exception as e:
        logger.error(f"Error getting results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/{url_hash}")
async def get_result_by_url(
    url_hash: str,
    file_storage_service: FileStorageService = Depends(get_file_storage_service)
):
    """Get a specific result by URL hash."""
    try:
        result = await file_storage_service.get_result_by_hash(url_hash)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Result not found: {url_hash}"
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting result {url_hash}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.delete("/", status_code=status.HTTP_200_OK)
async def clear_results(
    job_id: Optional[str] = Query(None, description="Clear results for specific job ID"),
    file_storage_service: FileStorageService = Depends(get_file_storage_service)
):
    """Clear crawl results."""
    try:
        result = await file_storage_service.clear_results(job_id=job_id)
        return {
            "message": "Results cleared successfully",
            "deleted_count": result.get("deleted_count", 0)
        }
    except Exception as e:
        logger.error(f"Error clearing results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/stats")
async def get_results_stats(
    file_storage_service: FileStorageService = Depends(get_file_storage_service)
):
    """Get results statistics."""
    try:
        stats = await file_storage_service.get_results_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting results stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/", include_in_schema=False)
async def get_results_no_slash(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(100, ge=1, le=1000, description="Page size"),
    job_id: Optional[str] = Query(None, description="Filter by job ID"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    file_storage_service: FileStorageService = Depends(get_file_storage_service)
):
    return await get_results(page, size, job_id, domain, file_storage_service)


@router.get("/stats/", include_in_schema=False)
async def get_results_stats_slash(
    file_storage_service: FileStorageService = Depends(get_file_storage_service)
):
    return await get_results_stats(file_storage_service) 