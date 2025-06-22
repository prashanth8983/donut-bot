"""
Crawler API endpoints.
Handles HTTP requests for crawler control and status.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ....services.crawler_service import crawler_service
from ....core.crawler.config import CrawlerConfig
from ....exceptions import CrawlError, ConfigurationError
from ....core.logger import get_logger

logger = get_logger("crawler_api")
router = APIRouter()


class AddUrlsRequest(BaseModel):
    """Request model for adding URLs."""
    urls: List[str]


class UpdateDomainsRequest(BaseModel):
    """Request model for updating allowed domains."""
    action: str  # 'add', 'remove', or 'replace'
    domains: List[str]


class StartCrawlerRequest(BaseModel):
    """Request model for starting crawler with optional configuration."""
    config: Optional[CrawlerConfig] = None


class ResetCrawlerRequest(BaseModel):
    """Request model for resetting crawler state."""
    clear_completed: bool = True
    clear_seen: bool = True
    clear_processing: bool = False
    clear_queue: bool = False


@router.post("/start", status_code=status.HTTP_200_OK)
async def start_crawler(request: StartCrawlerRequest):
    """Start the crawler with optional configuration."""
    try:
        # If config provided, update crawler configuration
        if request.config:
            await crawler_service.update_configuration(request.config)
        
        success = await crawler_service.start_crawler()
        if success:
            logger.info("Crawler started via API")
            return {"message": "Crawler started successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to start crawler"
            )
    except CrawlError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error starting crawler: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/stop", status_code=status.HTTP_200_OK)
async def stop_crawler():
    """Stop the crawler engine."""
    try:
        success = await crawler_service.stop_crawler()
        if success:
            logger.info("Crawler stopped via API")
            return {"message": "Crawler stopped successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to stop crawler"
            )
    except Exception as e:
        logger.error(f"Error stopping crawler: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/status")
async def get_crawler_status():
    """Get comprehensive crawler status."""
    try:
        status_data = await crawler_service.get_status()
        return status_data
    except Exception as e:
        logger.error(f"Error getting crawler status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/urls", status_code=status.HTTP_200_OK)
async def add_urls(request: AddUrlsRequest):
    """Add URLs to the crawler frontier."""
    try:
        result = await crawler_service.add_urls(request.urls)
        logger.info(f"Added {result['added_count']} URLs to crawler frontier")
        return result
    except CrawlError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error adding URLs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/config/allowed_domains")
async def get_allowed_domains():
    """Get current allowed domains configuration."""
    try:
        domains = await crawler_service.get_allowed_domains()
        return {"allowed_domains": domains}
    except Exception as e:
        logger.error(f"Error getting allowed domains: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/config/allowed_domains", status_code=status.HTTP_200_OK)
async def update_allowed_domains(request: UpdateDomainsRequest):
    """Update allowed domains configuration."""
    try:
        if request.action not in ['add', 'remove', 'replace']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid action. Must be 'add', 'remove', or 'replace'"
            )
        
        result = await crawler_service.update_allowed_domains(request.action, request.domains)
        logger.info(f"Updated allowed domains: {result['message']}")
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except CrawlError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating allowed domains: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/reset", status_code=status.HTTP_200_OK)
async def reset_crawler_status(request: ResetCrawlerRequest):
    """Reset crawler state and data."""
    try:
        result = await crawler_service.reset_crawl_status(
            clear_completed=request.clear_completed,
            clear_seen=request.clear_seen,
            clear_processing=request.clear_processing,
            clear_queue=request.clear_queue
        )
        logger.info("Crawler status reset via API")
        return result
    except CrawlError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error resetting crawler status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 