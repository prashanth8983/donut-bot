"""
Crawler API endpoints.
Handles HTTP requests for crawler operations and control.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from db.schemas import CrawlerConfigModel
from services.crawler_service import CrawlerService
from services.kafka_service import get_kafka_service
from services.file_storage_service import get_file_storage_service
from exceptions import ServiceError, ConfigurationError
from core.logger import get_logger
from api.deps import get_crawler_service

logger = get_logger("crawler_api")
router = APIRouter()


@router.get("/status")
async def get_crawler_status(crawler_service: CrawlerService = Depends(get_crawler_service)):
    """Get current crawler status and metrics."""
    try:
        status_data = await crawler_service.get_status()
        return status_data
    except Exception as e:
        logger.error(f"Error getting crawler status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get crawler status"
        )


@router.get("/status/", include_in_schema=False)
async def get_crawler_status_slash(crawler_service: CrawlerService = Depends(get_crawler_service)):
    return await get_crawler_status(crawler_service)


@router.post("/start")
async def start_crawler(
    job_id: Optional[str] = None,
    crawler_service: CrawlerService = Depends(get_crawler_service)
):
    """Start the crawler."""
    try:
        success = await crawler_service.start_crawler(job_id=job_id)
        if success:
            message = "Crawler started successfully"
            if job_id:
                message += f" with job tracking for job {job_id}"
            return {"message": message}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Crawler is already running"
            )
    except Exception as e:
        logger.error(f"Error starting crawler: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start crawler"
        )


@router.post("/stop")
async def stop_crawler(crawler_service: CrawlerService = Depends(get_crawler_service)):
    """Stop the crawler."""
    try:
        success = await crawler_service.stop_crawler()
        if success:
            return {"message": "Crawler stopped successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Crawler is not running"
            )
    except Exception as e:
        logger.error(f"Error stopping crawler: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stop crawler"
        )


@router.post("/pause")
async def pause_crawler(crawler_service: CrawlerService = Depends(get_crawler_service)):
    """Pause the crawler."""
    try:
        success = await crawler_service.stop_crawler()
        if success:
            return {"message": "Crawler paused successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Crawler is not running"
            )
    except Exception as e:
        logger.error(f"Error pausing crawler: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to pause crawler"
        )


@router.post("/resume")
async def resume_crawler(
    job_id: Optional[str] = None,
    crawler_service: CrawlerService = Depends(get_crawler_service)
):
    """Resume the crawler."""
    try:
        success = await crawler_service.start_crawler(job_id=job_id)
        if success:
            message = "Crawler resumed successfully"
            if job_id:
                message += f" with job tracking for job {job_id}"
            return {"message": message}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Crawler is not paused"
            )
    except Exception as e:
        logger.error(f"Error resuming crawler: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resume crawler"
        )


@router.post("/add_seeds")
async def add_seed_urls(
    urls: List[str],
    crawler_service: CrawlerService = Depends(get_crawler_service)
):
    """Add seed URLs to the crawler."""
    try:
        if not urls:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URLs list cannot be empty"
            )
        
        results = await crawler_service.add_urls(urls)
        return {
            "message": f"Added {results['added_count']} URLs, skipped {results['skipped_count']}, invalid {results['invalid_count']}",
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding seed URLs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add seed URLs"
        )


@router.post("/flush_status")
async def flush_crawl_status(
    clear_completed: bool = True,
    clear_seen: bool = True,
    clear_processing: bool = False,
    clear_queue: bool = False,
    clear_bloom_filter: bool = True,
    crawler_service: CrawlerService = Depends(get_crawler_service)
):
    """Clear crawl status and reset crawler state."""
    try:
        results = await crawler_service.reset_crawl_status(
            clear_completed=clear_completed,
            clear_seen=clear_seen,
            clear_processing=clear_processing,
            clear_queue=clear_queue
        )
        
        return {
            "message": "Crawl status flushed successfully",
            "results": results
        }
    except Exception as e:
        logger.error(f"Error flushing crawl status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to flush crawl status"
        )


@router.get("/allowed_domains")
async def get_allowed_domains(crawler_service: CrawlerService = Depends(get_crawler_service)):
    """Get current allowed domains configuration."""
    try:
        domains = await crawler_service.get_allowed_domains()
        return {"allowed_domains": domains}
    except Exception as e:
        logger.error(f"Error getting allowed domains: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get allowed domains"
        )


@router.get("/allowed_domains/", include_in_schema=False)
async def get_allowed_domains_slash(crawler_service: CrawlerService = Depends(get_crawler_service)):
    return await get_allowed_domains(crawler_service)


@router.post("/allowed_domains")
async def update_allowed_domains(
    action: str,
    domains: List[str],
    crawler_service: CrawlerService = Depends(get_crawler_service)
):
    """Update allowed domains configuration."""
    try:
        if action not in ["add", "remove", "replace"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Action must be 'add', 'remove', or 'replace'"
            )
        
        if not domains:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Domains list cannot be empty"
            )
        
        results = await crawler_service.update_allowed_domains(action, domains)
        return {
            "message": f"Domains updated successfully: {results['message']}",
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating allowed domains: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update allowed domains"
        )


@router.get("/kafka/status")
async def get_kafka_status():
    """Get Kafka service status."""
    try:
        kafka_service = await get_kafka_service()
        if kafka_service:
            status_data = await kafka_service.get_status()
            return status_data
        else:
            return {"enabled": False, "message": "Kafka service not configured"}
    except Exception as e:
        logger.error(f"Error getting Kafka status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get Kafka status"
        )


@router.get("/kafka/status/", include_in_schema=False)
async def get_kafka_status_slash():
    return await get_kafka_status()


@router.get("/storage/status")
async def get_storage_status():
    """Get file storage service status."""
    try:
        storage_service = await get_file_storage_service()
        stats = await storage_service.get_storage_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting storage status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get storage status"
        )


@router.get("/storage/status/", include_in_schema=False)
async def get_storage_status_slash():
    return await get_storage_status()


@router.post("/storage/cleanup")
async def cleanup_storage(max_age_days: int = 30):
    """Clean up old files in storage."""
    try:
        storage_service = await get_file_storage_service()
        results = await storage_service.cleanup_old_files(max_age_days)
        return {
            "message": f"Storage cleanup completed: {results['deleted']} files deleted",
            "results": results
        }
    except Exception as e:
        logger.error(f"Error cleaning up storage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cleanup storage"
        ) 