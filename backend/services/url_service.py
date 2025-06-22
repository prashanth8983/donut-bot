"""
URL service for managing URL operations.
Provides business logic for URL management.
"""

from typing import List, Dict, Any
from ..core.logger import get_logger
from ..exceptions import CrawlError
from ..core.crawler.url_utils import normalize_url

logger = get_logger("url_service")


class URLService:
    """Service for managing URL operations."""
    
    def __init__(self, crawler_service):
        self.crawler_service = crawler_service
    
    async def add_urls(self, urls: List[str]) -> Dict[str, Any]:
        """Add URLs to the crawler queue."""
        if not self.crawler_service.crawler_engine or not self.crawler_service.crawler_engine.url_frontier:
            raise CrawlError("Crawler not initialized")
        
        if not self.crawler_service.crawler_engine.running:
            raise CrawlError("Crawler is not running")
        
        added_count = 0
        skipped_count = 0
        invalid_count = 0
        
        for url in urls:
            try:
                normalized_url = normalize_url(url)
                if not normalized_url:
                    invalid_count += 1
                    logger.warning(f"Invalid URL: {url}")
                    continue
                
                if await self.crawler_service.crawler_engine.url_frontier.add_url(normalized_url, priority=1.0, depth=0):
                    added_count += 1
                    logger.info(f"Added URL to frontier: {normalized_url}")
                else:
                    skipped_count += 1
                    logger.debug(f"Skipped URL (already seen): {normalized_url}")
            except Exception as e:
                invalid_count += 1
                logger.error(f"Error adding URL {url}: {e}")
        
        return {
            'added_count': added_count,
            'skipped_count': skipped_count,
            'invalid_count': invalid_count,
            'total_processed': len(urls)
        }
    
    async def get_queue_status(self) -> Dict[str, Any]:
        """Get URL queue status."""
        if not self.crawler_service.crawler_engine or not self.crawler_service.crawler_engine.url_frontier:
            return {
                'queue_size': 0,
                'processing_count': 0,
                'completed_count': 0,
                'seen_count': 0,
                'error': 'Crawler not initialized'
            }
        
        try:
            frontier = self.crawler_service.crawler_engine.url_frontier
            return {
                'queue_size': await frontier.size(),
                'processing_count': await frontier.get_processing_count(),
                'completed_count': await frontier.get_completed_count(),
                'seen_count': await frontier.get_seen_count()
            }
        except Exception as e:
            logger.error(f"Error getting queue status: {e}")
            return {
                'queue_size': 0,
                'processing_count': 0,
                'completed_count': 0,
                'seen_count': 0,
                'error': str(e)
            }
    
    async def clear_queue(self) -> Dict[str, Any]:
        """Clear URL queue and data."""
        if not self.crawler_service.crawler_engine or not self.crawler_service.crawler_engine.url_frontier:
            raise CrawlError("Crawler not initialized")
        
        try:
            result = await self.crawler_service.crawler_engine.url_frontier.clear_all_frontier_data()
            logger.info("URL queue cleared successfully")
            return {
                'message': 'URL queue cleared successfully',
                'details': result
            }
        except Exception as e:
            logger.error(f"Error clearing URL queue: {e}")
            raise CrawlError(f"Failed to clear URL queue: {e}")


# Dependency injection
async def get_url_service():
    """Get URL service instance."""
    from .crawler_service import crawler_service
    return URLService(crawler_service) 