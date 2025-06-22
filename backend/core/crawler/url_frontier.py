"""
URL Frontier for the crawler.
Manages URL queue, seen URLs, and processing state using Redis.
"""

import asyncio
import json
import time
from typing import Optional, Dict, Any
from redis.asyncio import Redis
from urllib.parse import urlparse

from ..logger import get_logger
from .url_utils import normalize_url

logger = get_logger("crawler.url_frontier")


class URLFrontier:
    """Manages URL queue, seen URLs, and processing state using Redis."""
    
    def __init__(self, config):
        self.config = config
        self.redis: Optional[Redis] = None
        self.queue_key = "crawler:url_queue_prio"
        self.seen_urls = "crawler:seen_urls_global"
        self.processing_urls = "crawler:processing_urls_global"
        self.completed_urls = "crawler:completed_urls_global"

    async def initialize(self):
        """Initialize Redis connection."""
        if not self.redis:
            try:
                self.redis = Redis(
                    host=self.config.redis_host,
                    port=self.config.redis_port,
                    db=self.config.redis_db,
                    password=self.config.redis_password,
                    decode_responses=True
                )
                await self.redis.ping()
                logger.info("URL Frontier: Redis connection established")
            except Exception as e:
                logger.error(f"URL Frontier: Redis connection failed: {e}")
                raise ConnectionError(f"Redis connection failed: {e}")

    async def close(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.aclose()
            self.redis = None
            logger.info("URL Frontier: Redis connection closed")

    async def add_url(self, url: str, priority: float = 0.5, depth: int = 0) -> bool:
        """Add a URL to the frontier queue."""
        if not self.redis:
            await self.initialize()
        
        norm_url = normalize_url(url)
        if not norm_url:
            logger.warning(f"URL Frontier: Invalid URL: {url}")
            return False
        
        try:
            # Check if URL is already completed
            if await self.redis.sismember(self.completed_urls, norm_url):
                logger.debug(f"URL Frontier: URL already completed: {norm_url}")
                return False
            
            # Try to add to seen URLs set
            if not await self.redis.sadd(self.seen_urls, norm_url):
                logger.debug(f"URL Frontier: URL already seen: {norm_url}")
                return False
            
            # Create URL data
            data = {
                'url': norm_url,
                'original_url': url,
                'priority': priority,
                'depth': depth,
                'added_at': time.time(),
                'domain': urlparse(norm_url).netloc
            }
            
            # Calculate score for priority queue (negative priority for min-heap behavior)
            score = -priority + (data['added_at'] / 1_000_000_000)
            await self.redis.zadd(self.queue_key, {json.dumps(data): score})
            
            logger.debug(f"URL Frontier: Added URL to queue: {norm_url} (priority: {priority}, depth: {depth})")
            return True
            
        except Exception as e:
            logger.error(f"URL Frontier: Error adding URL {url}: {e}")
            return False

    async def get_url(self, timeout: int = 1) -> Optional[Dict[str, Any]]:
        """Get the next URL from the frontier queue."""
        if not self.redis:
            await self.initialize()
        
        try:
            # Get URL with highest priority (lowest score)
            results = await self.redis.zpopmin(self.queue_key, count=1)
            if not results:
                return None
            
            data_str, _ = results[0]
            data = json.loads(data_str)
            norm_url = data['url']
            
            # Mark URL as processing
            if await self.redis.sadd(self.processing_urls, norm_url):
                logger.debug(f"URL Frontier: Processing URL: {norm_url}")
                return data
            else:
                # URL is already being processed, try to get another one
                logger.debug(f"URL Frontier: URL already processing, retrying: {norm_url}")
                return await self.get_url(timeout)
                
        except Exception as e:
            logger.error(f"URL Frontier: Error getting URL: {e}")
            return None

    async def mark_completed(self, norm_url: str):
        """Mark a URL as completed."""
        if not self.redis:
            await self.initialize()
        
        try:
            await self.redis.srem(self.processing_urls, norm_url)
            await self.redis.sadd(self.completed_urls, norm_url)
            logger.debug(f"URL Frontier: Marked URL as completed: {norm_url}")
        except Exception as e:
            logger.error(f"URL Frontier: Error marking URL as completed {norm_url}: {e}")

    async def mark_failed(self, norm_url: str, depth: int, original_url: str = None, retry_policy: Dict = None):
        """Mark a URL as failed."""
        if not self.redis:
            await self.initialize()
        
        try:
            await self.redis.srem(self.processing_urls, norm_url)
            logger.debug(f"URL Frontier: Marked URL as failed: {norm_url}")
        except Exception as e:
            logger.error(f"URL Frontier: Error marking URL as failed {norm_url}: {e}")

    async def is_url_completed(self, url: str) -> bool:
        """Check if a URL has been completed."""
        if not self.redis:
            await self.initialize()
        
        try:
            return await self.redis.sismember(self.completed_urls, normalize_url(url))
        except Exception as e:
            logger.error(f"URL Frontier: Error checking URL completion {url}: {e}")
            return False

    async def size(self) -> int:
        """Get the size of the URL queue."""
        if not self.redis:
            await self.initialize()
        
        try:
            return await self.redis.zcard(self.queue_key)
        except Exception as e:
            logger.error(f"URL Frontier: Error getting queue size: {e}")
            return 0

    async def get_processing_count(self) -> int:
        """Get the number of URLs currently being processed."""
        if not self.redis:
            await self.initialize()
        
        try:
            return await self.redis.scard(self.processing_urls)
        except Exception as e:
            logger.error(f"URL Frontier: Error getting processing count: {e}")
            return 0

    async def get_completed_count(self) -> int:
        """Get the number of completed URLs."""
        if not self.redis:
            await self.initialize()
        
        try:
            return await self.redis.scard(self.completed_urls)
        except Exception as e:
            logger.error(f"URL Frontier: Error getting completed count: {e}")
            return 0

    async def get_seen_count(self) -> int:
        """Get the number of seen URLs."""
        if not self.redis:
            await self.initialize()
        
        try:
            return await self.redis.scard(self.seen_urls)
        except Exception as e:
            logger.error(f"URL Frontier: Error getting seen count: {e}")
            return 0

    async def clear_all_frontier_data(self):
        """Clear all frontier data."""
        if not self.redis:
            await self.initialize()
        
        keys = [self.queue_key, self.seen_urls, self.processing_urls, self.completed_urls]
        try:
            await self.redis.delete(*keys)
            logger.info("URL Frontier: Cleared all frontier data")
        except Exception as e:
            logger.error(f"URL Frontier: Error clearing frontier data: {e}")

    async def clear_specific_data(self, clear_completed: bool = False, clear_seen: bool = False, 
                                 clear_processing: bool = False, clear_queue: bool = False) -> Dict[str, Any]:
        """Clear specific frontier data."""
        if not self.redis:
            await self.initialize()
        
        keys = []
        counts = {}
        
        async def count(key: str, type_: str) -> int:
            try:
                if type_ == 'set':
                    return await self.redis.scard(key)
                else:
                    return await self.redis.zcard(key)
            except Exception:
                return 0
        
        if clear_completed:
            counts[self.completed_urls] = await count(self.completed_urls, 'set')
            keys.append(self.completed_urls)
        
        if clear_seen:
            counts[self.seen_urls] = await count(self.seen_urls, 'set')
            keys.append(self.seen_urls)
        
        if clear_processing:
            counts[self.processing_urls] = await count(self.processing_urls, 'set')
            keys.append(self.processing_urls)
        
        if clear_queue:
            counts[self.queue_key] = await count(self.queue_key, 'zset')
            keys.append(self.queue_key)
        
        deleted = 0
        if keys:
            try:
                deleted = await self.redis.delete(*keys)
                logger.info(f"URL Frontier: Cleared {deleted} keys: {keys}")
            except Exception as e:
                logger.error(f"URL Frontier: Error clearing specific data: {e}")
                return {"message": "Delete error", "keys": keys, "error": str(e)}
        
        return {
            "message": "Clear done",
            "keys": keys,
            "deleted": deleted,
            "counts": counts
        } 