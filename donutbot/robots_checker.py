import aiohttp
import asyncio
from urllib.parse import urlparse, urljoin
from urllib.robotparser import RobotFileParser
from functions.crawler_config import CrawlerConfig
from functions.rate_limiter import RateLimiter
from functions.url_utils import normalize_url
import time

class RobotsChecker:
    def __init__(self, config, rate_limiter):
        self.config = config
        self.rate_limiter = rate_limiter
        self.robots_cache = {}
        self.session = None
        self._lock = asyncio.Lock()
        self._domain_locks = {}
        self._own_session = False

    async def _get_domain_lock(self, domain_key):
        async with self._lock:
            return self._domain_locks.setdefault(domain_key, asyncio.Lock())

    async def initialize(self, session=None):
        if session and not session.closed:
            self.session = session
            self._own_session = False
        elif not self.session or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=min(15, self.config.request_timeout))
            headers = {'User-Agent': self.config.user_agent, 'Accept-Encoding': 'br, gzip, deflate'}
            self.session = aiohttp.ClientSession(timeout=timeout, headers=headers)
            self._own_session = True

    async def close(self):
        if self.session and self._own_session and not self.session.closed:
            await self.session.close()
        self.session = None

    async def _fetch_robots_txt(self, url):
        if not self.session or self.session.closed:
            await self.initialize()
            if not self.session or self.session.closed:
                return None
        try:
            async with self.session.get(url, allow_redirects=False) as resp:
                if resp.status == 200:
                    content = await resp.text(encoding='utf-8', errors='ignore')
                    if content.strip().lower().startswith(('<!doctype html', '<html')):
                        return ""
                    return content
                if resp.status in [301, 302, 307, 308]:
                    return None
                if resp.status in [401, 403, 404, 410]:
                    return ""
                return None
        except asyncio.TimeoutError:
            return None
        except aiohttp.ClientError:
            return None
        except:
            return None

    async def _get_robots_data(self, domain_key):
        domain_lock = await self._get_domain_lock(domain_key)
        async with domain_lock:
            cache = self.robots_cache.get(domain_key)
            if cache and time.time() - cache['timestamp'] < self.config.robots_cache_time:
                return cache['parser']
            robots_url = urljoin(domain_key, "robots.txt")
            content = await self._fetch_robots_txt(robots_url)
            parser = RobotFileParser()
            parser.set_url(robots_url)
            if content is None:
                self.robots_cache[domain_key] = {'parser': None, 'timestamp': time.time(), 'status': 'fetch_error'}
                return None
            if not content.strip():
                pass
            else:
                try:
                    parser.parse(content.splitlines())
                except:
                    self.robots_cache[domain_key] = {'parser': None, 'timestamp': time.time(), 'status': 'parse_error'}
                    return None
            try:
                delay = parser.crawl_delay(self.config.user_agent)
                if delay is not None:
                    domain = urlparse(domain_key).netloc
                    if domain:
                        self.rate_limiter.update_custom_delay(domain, float(delay))
            except:
                pass
            self.robots_cache[domain_key] = {'parser': parser, 'timestamp': time.time(), 'status': 'success'}
            return parser

    async def can_fetch(self, user_agent, url):
        if not self.config.respect_robots_txt:
            return True
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return False
            domain_key = f"{parsed.scheme}://{parsed.netloc.lower()}"
            parser = await self._get_robots_data(domain_key)
            if parser is None:
                return False
            return parser.can_fetch(user_agent, url)
        except:
            return False

    async def get_crawl_delay_for_url(self, url):
        if not self.config.respect_robots_txt:
            return None
        try:
            domain = urlparse(url).netloc
            if not domain:
                return None
            return self.rate_limiter.get_current_delay_for_domain(domain)
        except:
            return None