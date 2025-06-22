"""
Crawler service for managing the crawler engine.
Provides business logic for crawler operations.
"""

import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from ..core.crawler.engine import CrawlerEngine
from ..core.crawler.config import CrawlerConfig
from ..core.logger import get_logger
from ..exceptions import CrawlError, ConfigurationError

logger = get_logger("crawler_service")


class CrawlerService:
    """Service for managing the crawler engine."""
    
    def __init__(self):
        self.crawler_engine: Optional[CrawlerEngine] = None
        self.config: Optional[CrawlerConfig] = None
        self.crawler_task: Optional[asyncio.Task] = None
        
    async def initialize(self, config: CrawlerConfig):
        """Initialize the crawler service with configuration."""
        try:
            logger.info("Initializing crawler service...")
            self.config = config
            self.crawler_engine = CrawlerEngine(config)
            await self.crawler_engine.initialize()
            logger.info("Crawler service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize crawler service: {e}")
            raise ConfigurationError(f"Crawler service initialization failed: {e}")
    
    async def start_crawler(self) -> bool:
        """Start the crawler engine."""
        try:
            if not self.crawler_engine:
                raise CrawlError("Crawler engine not initialized")
            
            if self.crawler_engine.running:
                logger.warning("Crawler is already running")
                return True
            
            logger.info("Starting crawler...")
            self.crawler_task = asyncio.create_task(self.crawler_engine.run())
            return True
            
        except Exception as e:
            logger.error(f"Failed to start crawler: {e}")
            return False
    
    async def stop_crawler(self) -> bool:
        """Stop the crawler engine."""
        try:
            if not self.crawler_engine:
                return True
            
            if not self.crawler_engine.running:
                logger.warning("Crawler is not running")
                return True
            
            logger.info("Stopping crawler...")
            await self.crawler_engine.stop()
            
            if self.crawler_task and not self.crawler_task.done():
                self.crawler_task.cancel()
                try:
                    await self.crawler_task
                except asyncio.CancelledError:
                    pass
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop crawler: {e}")
            return False
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current crawler status."""
        if not self.crawler_engine:
            return {
                'crawler_running': False,
                'error': 'Crawler not initialized'
            }
        
        try:
            return await self.crawler_engine.get_status()
        except Exception as e:
            logger.error(f"Error getting crawler status: {e}")
            return {
                'crawler_running': False,
                'error': str(e)
            }
    
    async def add_urls(self, urls: List[str]) -> Dict[str, Any]:
        """Add URLs to the crawler frontier."""
        if not self.crawler_engine or not self.crawler_engine.url_frontier:
            raise CrawlError("Crawler not initialized")
        
        if not self.crawler_engine.running:
            raise CrawlError("Crawler is not running")
        
        added_count = 0
        skipped_count = 0
        invalid_count = 0
        
        for url in urls:
            try:
                if await self.crawler_engine.url_frontier.add_url(url, priority=1.0, depth=0):
                    added_count += 1
                    logger.info(f"Added URL to frontier: {url}")
                else:
                    skipped_count += 1
                    logger.debug(f"Skipped URL (already seen): {url}")
            except Exception as e:
                invalid_count += 1
                logger.error(f"Error adding URL {url}: {e}")
        
        return {
            'added_count': added_count,
            'skipped_count': skipped_count,
            'invalid_count': invalid_count,
            'total_processed': len(urls)
        }
    
    async def update_allowed_domains(self, action: str, domains: List[str]) -> Dict[str, Any]:
        """Update allowed domains configuration."""
        if not self.crawler_engine or not self.config:
            raise CrawlError("Crawler not initialized")
        
        if self.config.allowed_domains is None:
            self.config.allowed_domains = []
        
        current_domains = set(self.config.allowed_domains)
        domains_to_process = set(d.lower().strip() for d in domains if d.strip())
        original_count = len(current_domains)
        
        if action == 'add':
            current_domains.update(domains_to_process)
            added_count = len(current_domains) - original_count
            message = f"Added {added_count} unique domains"
        elif action == 'remove':
            current_domains.difference_update(domains_to_process)
            removed_count = original_count - len(current_domains)
            message = f"Removed {removed_count} domains"
        elif action == 'replace':
            current_domains = domains_to_process
            message = f"Replaced allowed domains list with {len(current_domains)} domains"
        else:
            raise ValueError("Invalid action. Must be 'add', 'remove', or 'replace'")
        
        self.config.allowed_domains = sorted(list(current_domains))
        logger.info(f"Updated allowed domains: {action}. New list: {self.config.allowed_domains}")
        
        return {
            'message': message,
            'allowed_domains': self.config.allowed_domains,
            'total_domains': len(self.config.allowed_domains)
        }
    
    async def get_allowed_domains(self) -> List[str]:
        """Get current allowed domains."""
        if not self.config:
            return []
        return self.config.allowed_domains or []
    
    async def reset_crawl_status(self, clear_completed: bool = True, clear_seen: bool = True,
                                clear_processing: bool = False, clear_queue: bool = False) -> Dict[str, Any]:
        """Reset crawler status and clear data."""
        if not self.crawler_engine or not self.crawler_engine.url_frontier:
            raise CrawlError("Crawler not initialized")
        
        try:
            result = await self.crawler_engine.url_frontier.clear_specific_data(
                clear_completed=clear_completed,
                clear_seen=clear_seen,
                clear_processing=clear_processing,
                clear_queue=clear_queue
            )
            
            # Reset metrics
            if self.crawler_engine.metrics:
                self.crawler_engine.metrics.reset()
            
            # Clear bloom filter
            if self.crawler_engine.bloom_filter:
                self.crawler_engine.bloom_filter.clear()
            
            logger.info("Crawler status reset successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error resetting crawler status: {e}")
            raise CrawlError(f"Failed to reset crawler status: {e}")
    
    async def close(self):
        """Close the crawler service and cleanup resources."""
        try:
            await self.stop_crawler()
            if self.crawler_engine:
                await self.crawler_engine.close()
            logger.info("Crawler service closed successfully")
        except Exception as e:
            logger.error(f"Error closing crawler service: {e}")


# Global crawler service instance
crawler_service = CrawlerService() 