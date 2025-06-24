"""
URLs API endpoints.
Handles HTTP requests for URL management operations.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ....services.url_service import get_url_service, URLService
from ....exceptions import CrawlError
from ....core.logger import get_logger

logger = get_logger("urls_api")
router = APIRouter()


class AddUrlsRequest(BaseModel):
    """Request model for adding URLs."""
    urls: List[str]


@router.post("/add", status_code=status.HTTP_200_OK)
async def add_urls(
    request: AddUrlsRequest,
    url_service: URLService = Depends(get_url_service)
):
    """Add URLs to the crawler queue."""
    try:
        result = await url_service.add_urls(request.urls)
        logger.info(f"Added {result['added_count']} URLs to crawler queue")
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


@router.get("/queue")
async def get_url_queue_status(
    url_service: URLService = Depends(get_url_service)
):
    """Get URL queue status."""
    try:
        status_data = await url_service.get_queue_status()
        return status_data
    except Exception as e:
        logger.error(f"Error getting URL queue status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.delete("/clear", status_code=status.HTTP_200_OK)
async def clear_url_queue(
    url_service: URLService = Depends(get_url_service)
):
    """Clear URL queue and data."""
    try:
        result = await url_service.clear_queue()
        logger.info("URL queue cleared successfully")
        return result
    except Exception as e:
        logger.error(f"Error clearing URL queue: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/urls")
async def get_urls(
    url_service: URLService = Depends(get_url_service)
):
    """Get URLs from the crawler queue."""
    try:
        urls_data = await url_service.get_queue_status()
        return urls_data
    except Exception as e:
        logger.error(f"Error getting URLs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 