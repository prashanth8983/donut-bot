import asyncio
import json
import time
from redis.asyncio import Redis
from .url_utils import normalize_url

class URLFrontier:
    def __init__(self, config):
        self.config = config
        self.redis = None
        self.queue_key = "crawler:url_queue_prio"
        self.seen_urls = "crawler:seen_urls_global"
        self.processing_urls = "crawler:processing_urls_global"
        self.completed_urls = "crawler:completed_urls_global"

    async def initialize(self):
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
            except Exception as e:
                raise ConnectionError("Redis failed")

    async def close(self):
        if self.redis:
            await self.redis.aclose()
            self.redis = None

    async def add_url(self, url, priority=0.5, depth=0):
        if not self.redis: await self.initialize()
        norm_url = normalize_url(url)
        if not norm_url: return False
        try:
            if await self.redis.sismember(self.completed_urls, norm_url):
                return False
            if not await self.redis.sadd(self.seen_urls, norm_url):
                return False
            from urllib.parse import urlparse
            data = {
                'url': norm_url, 'original_url': url, 'priority': priority,
                'depth': depth, 'added_at': time.time(),
                'domain': urlparse(norm_url).netloc
            }
            score = -priority + (data['added_at'] / 1_000_000_000)
            await self.redis.zadd(self.queue_key, {json.dumps(data): score})
            return True
        except:
            return False

    async def get_url(self, timeout=1):
        if not self.redis: await self.initialize()
        try:
            results = await self.redis.zpopmin(self.queue_key, count=1)
            if not results: return None
            data_str, _ = results[0]
            data = json.loads(data_str)
            norm_url = data['url']
            if await self.redis.sadd(self.processing_urls, norm_url):
                return data
            return await self.get_url(timeout)
        except:
            return None

    async def mark_completed(self, norm_url):
        if not self.redis: await self.initialize()
        try:
            await self.redis.srem(self.processing_urls, norm_url)
            await self.redis.sadd(self.completed_urls, norm_url)
        except:
            pass

    async def mark_failed(self, norm_url, depth, original_url=None, retry_policy=None):
        if not self.redis: await self.initialize()
        try:
            await self.redis.srem(self.processing_urls, norm_url)
        except:
            pass

    async def is_url_completed(self, url):
        if not self.redis: await self.initialize()
        try:
            return await self.redis.sismember(self.completed_urls, normalize_url(url))
        except:
            return False

    async def size(self):
        if not self.redis: await self.initialize()
        try:
            return await self.redis.zcard(self.queue_key)
        except:
            return 0

    async def get_processing_count(self):
        if not self.redis: await self.initialize()
        try:
            return await self.redis.scard(self.processing_urls)
        except:
            return 0

    async def get_completed_count(self):
        if not self.redis: await self.initialize()
        try:
            return await self.redis.scard(self.completed_urls)
        except:
            return 0

    async def get_seen_count(self):
        if not self.redis: await self.initialize()
        try:
            return await self.redis.scard(self.seen_urls)
        except:
            return 0

    async def clear_all_frontier_data(self):
        if not self.redis: await self.initialize()
        keys = [self.queue_key, self.seen_urls, self.processing_urls, self.completed_urls]
        try:
            await self.redis.delete(*keys)
        except:
            pass

    async def clear_specific_data(self, clear_completed=False, clear_seen=False, clear_processing=False, clear_queue=False):
        if not self.redis: await self.initialize()
        keys = []
        counts = {}
        async def count(key, type):
            try:
                return await (self.redis.scard(key) if type == 'set' else self.redis.zcard(key))
            except:
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
            except:
                return {"message": "Delete error", "keys": keys}
        return {
            "message": "Clear done",
            "keys": keys,
            "deleted": deleted,
            "counts": counts
        }

    async def get_stats(self):
        """Return statistics about the URL frontier."""
        try:
            if not self.redis:
                await self.initialize()
            
            queue_size = await self.redis.zcard(self.queue_key)
            seen_count = await self.redis.scard(self.seen_urls)
            processing_count = await self.redis.scard(self.processing_urls)
            completed_count = await self.redis.scard(self.completed_urls)
            
            return {
                'queue_size': queue_size,
                'seen_urls': seen_count,
                'processing_urls': processing_count,
                'completed_urls': completed_count,
                'redis_connected': True
            }
        except Exception as e:
            return {
                'queue_size': 0,
                'seen_urls': 0,
                'processing_urls': 0,
                'completed_urls': 0,
                'redis_connected': False,
                'error': str(e)
            }