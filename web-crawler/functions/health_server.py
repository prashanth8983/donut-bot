import asyncio
from aiohttp import web
import time
import redis.asyncio as redis
from aiokafka import AIOKafkaProducer
from web_crawler import WebCrawler

class HealthServer:
    def __init__(self, crawler, port=8001):
        self.crawler = crawler
        self.port = port
        self.app = web.Application()
        self.app.router.add_get('/health', self.health_check)
        self.app.router.add_get('/health/detailed', self.detailed_health_check)
        self.app.router.add_get('/metrics', self.metrics)
        self.app.router.add_get('/stats', self.stats)
        self.runner = None
        self.site = None

    async def health_check(self, request):
        try:
            elapsed = time.time() - self.crawler.start_time
            rate = self.crawler.metrics.pages_crawled / elapsed if elapsed > 0 else 0
            queue_size = await self.crawler.url_frontier.size()
            healthy = (
                self.crawler and
                self.crawler.running and
                self.crawler.session and
                not self.crawler.session.closed
            )
            if healthy:
                return web.json_response({
                    'status': 'healthy',
                    'uptime': round(elapsed, 2),
                    'pages_crawled': self.crawler.metrics.pages_crawled,
                    'crawl_rate': round(rate, 2),
                    'errors': self.crawler.metrics.errors,
                    'robots_denied': self.crawler.metrics.robots_denied,
                    'queue_size': queue_size,
                    'workers': self.crawler.config.workers
                })
            return web.json_response({'status': 'unhealthy', 'reason': 'Crawler stopped'}, status=503)
        except:
            return web.json_response({'status': 'error'}, status=500)

    async def detailed_health_check(self, request):
        try:
            data = {'status': 'healthy', 'components': {}, 'timestamp': time.time()}
            data['components']['crawler'] = {
                'running': self.crawler.running,
                'uptime': round(time.time() - self.crawler.start_time, 2),
                'session_active': self.crawler.session and not self.crawler.session.closed
            }
            try:
                r = redis.Redis(
                    host=self.crawler.config.redis_host,
                    port=self.crawler.config.redis_port,
                    db=self.crawler.config.redis_db,
                    password=self.crawler.config.redis_password,
                    decode_responses=True
                )
                await r.ping()
                data['components']['redis'] = {'status': 'connected'}
                await r.close()
            except:
                data['components']['redis'] = {'status': 'error'}
                data['status'] = 'unhealthy'
            try:
                p = AIOKafkaProducer(bootstrap_servers=self.crawler.config.kafka_brokers)
                await p.start()
                await p.stop()
                data['components']['kafka'] = {'status': 'connected'}
            except:
                data['components']['kafka'] = {'status': 'error'}
                data['status'] = 'unhealthy'
            try:
                data['components']['frontier'] = {'queue_size': await self.crawler.url_frontier.size()}
            except:
                data['components']['frontier'] = {'status': 'error'}
                data['status'] = 'unhealthy'
            elapsed = time.time() - self.crawler.start_time
            rate = self.crawler.metrics.pages_crawled / elapsed if elapsed > 0 else 0
            data['metrics'] = {
                'pages_crawled': self.crawler.metrics.pages_crawled,
                'crawl_rate': round(rate, 2),
                'errors': self.crawler.metrics.errors,
                'robots_denied': self.crawler.metrics.robots_denied,
                'workers': self.crawler.config.workers
            }
            return web.json_response(data, status=200 if data['status'] == 'healthy' else 503)
        except:
            return web.json_response({'status': 'error'}, status=500)

    async def metrics(self, request):
        try:
            return web.Response(text=await self.crawler.metrics.export('prometheus'), content_type='text/plain')
        except:
            return web.json_response({'error': 'Metrics failed'}, status=500)

    async def stats(self, request):
        try:
            return web.json_response({
                'crawler': self.crawler.metrics.get_stats(),
                'frontier': await self.crawler.url_frontier.get_stats(),
                'rate_limiter': self.crawler.rate_limiter.get_stats(),
                'bloom_filter': self.crawler.bloom_filter.get_stats()
            })
        except:
            return web.json_response({'error': 'Stats failed'}, status=500)

    async def start(self):
        try:
            self.runner = web.AppRunner(self.app)
            await self.runner.setup()
            self.site = web.TCPSite(self.runner, '0.0.0.0', self.port)
            await self.site.start()
        except:
            raise RuntimeError("Server start failed")

    async def stop(self):
        try:
            if self.site:
                await self.site.stop()
            if self.runner:
                await self.runner.cleanup()
        except:
            raise RuntimeError("Server stop failed")

    def is_running(self):
        return self.runner is not None and self.site is not None