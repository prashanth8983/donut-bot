"""
Main crawler engine for donut-bot.
Handles crawling logic, job execution, and coordination.
"""

import asyncio
import aiohttp
import time
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Set
from urllib.parse import urljoin, urlparse
import uuid
import ssl
import hashlib
from pathlib import Path

from core.logger import get_logger
from .config import CrawlerConfig
from .url_frontier import URLFrontier
from .url_utils import normalize_url, get_domain, resolve_relative_url
from .metrics import CrawlerMetrics
from .content_extractor import ContentExtractor
from .robots_checker import RobotsChecker
from .rate_limiter import RateLimiter
from .bloom_filter import BloomFilter
from exceptions import CrawlError, RobotsError, RateLimitError

logger = get_logger("crawler.engine")


class CrawlerEngine:
    """Main crawler engine for donut-bot."""
    
    def __init__(self, config: CrawlerConfig):
        self.config = config
        self.running = False
        self.start_time = None
        self.workers = []
        self.session = None
        self.url_frontier = None
        self.metrics = None
        self.content_extractor = None
        self.robots_checker = None
        self.rate_limiter = None
        self.bloom_filter = None
        self.kafka_producer = None
        
        # Crawler state
        self.pages_crawled = 0
        self.errors = 0
        self.robots_denied = 0
        
        logger.info(f"Crawler Engine initialized with config: workers={config.workers}, max_depth={config.max_depth}, max_pages={config.max_pages}")

    async def initialize(self):
        """Initialize the crawler engine."""
        try:
            logger.info("Initializing crawler engine...")
            
            # Initialize components
            self.url_frontier = URLFrontier(self.config)
            await self.url_frontier.initialize()
            
            self.metrics = CrawlerMetrics()
            self.content_extractor = ContentExtractor(self.config)
            self.robots_checker = RobotsChecker(self.config)
            self.rate_limiter = RateLimiter(self.config)
            self.bloom_filter = BloomFilter(self.config.bloom_capacity, self.config.bloom_error_rate)
            
            # Initialize HTTP session
            connector = aiohttp.TCPConnector(
                limit=self.config.max_connections,
                limit_per_host=10,
                ssl=ssl.create_default_context() if self.config.ssl_verification_enabled else False
            )
            
            timeout = aiohttp.ClientTimeout(total=self.config.request_timeout)
            self.session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers=self.config.additional_headers
            )
            
            # Load seed URLs
            await self._load_seed_urls()
            
            logger.info("Crawler engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize crawler engine: {e}")
            raise CrawlError(f"Initialization failed: {e}")

    async def close(self):
        """Close the crawler engine and cleanup resources."""
        try:
            logger.info("Closing crawler engine...")
            
            self.running = False
            
            # Cancel all worker tasks
            for worker in self.workers:
                if not worker.done():
                    worker.cancel()
            
            # Wait for workers to finish
            if self.workers:
                await asyncio.gather(*self.workers, return_exceptions=True)
            
            # Close HTTP session
            if self.session:
                await self.session.close()
            
            # Close URL frontier
            if self.url_frontier:
                await self.url_frontier.close()
            
            # Close Kafka producer
            if self.kafka_producer:
                self.kafka_producer.stop()
            
            logger.info("Crawler engine closed successfully")
            
        except Exception as e:
            logger.error(f"Error closing crawler engine: {e}")

    async def _load_seed_urls(self):
        """Load seed URLs from configuration."""
        try:
            seed_urls = self.config.seed_urls.copy()
            logger.debug(f"Seed URLs to add: {seed_urls}")
            
            # Load from file if specified
            if self.config.seed_urls_file and Path(self.config.seed_urls_file).exists():
                with open(self.config.seed_urls_file, 'r') as f:
                    file_urls = [line.strip() for line in f if line.strip()]
                    seed_urls.extend(file_urls)
            
            # Add seed URLs to frontier
            for url in seed_urls:
                normalized_url = normalize_url(url)
                logger.debug(f"Trying to add seed URL: {url} (normalized: {normalized_url})")
                if self.url_frontier and normalized_url:
                    added = await self.url_frontier.add_url(normalized_url, priority=1.0, depth=0)
                    logger.debug(f"Result of adding {normalized_url}: {added}")
                else:
                    logger.warning("URLFrontier is not initialized or normalized_url is invalid.")
            
            logger.info(f"Loaded {len(seed_urls)} seed URLs")
            
        except Exception as e:
            logger.error(f"Error loading seed URLs: {e}")

    async def crawl_page(self, url_to_crawl: str, depth: int = 0) -> Optional[Dict[str, Any]]:
        """Crawl a single page and extract content."""
        try:
            logger.debug(f"Crawling page: {url_to_crawl} at depth {depth}")
            
            # Check if URL is already seen in bloom filter
            if self.bloom_filter and self.bloom_filter.contains(url_to_crawl):
                logger.debug(f"URL already seen in bloom filter: {url_to_crawl}")
                return None
            
            # Add URL to bloom filter to mark as seen
            if self.bloom_filter:
                self.bloom_filter.add(url_to_crawl)
            
            # Check rate limits
            domain = get_domain(url_to_crawl)
            if self.rate_limiter and domain:
                await self.rate_limiter.wait_if_needed(domain)
            
            # Check robots.txt
            if self.config.respect_robots_txt:
                if self.robots_checker and not await self.robots_checker.can_fetch(url_to_crawl):
                    self.robots_denied += 1
                    logger.debug(f"Robots.txt denied: {url_to_crawl}")
                    # Mark URL as completed since robots.txt denied it
                    if self.url_frontier:
                        await self.url_frontier.mark_completed(url_to_crawl)
                    return None
            
            # Fetch the page
            if self.session:
                async with self.session.get(url_to_crawl, allow_redirects=self.config.allow_redirects) as response:
                    if response.status != 200:
                        logger.warning(f"HTTP {response.status} for {url_to_crawl}")
                        # Mark URL as completed since it failed
                        if self.url_frontier:
                            await self.url_frontier.mark_completed(url_to_crawl)
                        return None
                    
                    content_type = response.headers.get('content-type', '').lower()
                    if not any(ct in content_type for ct in self.config.allowed_content_types):
                        logger.debug(f"Unsupported content type {content_type} for {url_to_crawl}")
                        # Mark URL as completed since content type is not supported
                        if self.url_frontier:
                            await self.url_frontier.mark_completed(url_to_crawl)
                        return None
                    
                    # Read content
                    content = await response.text()
                    if len(content) > self.config.max_content_size:
                        logger.warning(f"Content too large ({len(content)} bytes) for {url_to_crawl}")
                        # Mark URL as completed since content is too large
                        if self.url_frontier:
                            await self.url_frontier.mark_completed(url_to_crawl)
                        return None
                    
                    # Extract content and links
                    if self.content_extractor:
                        extracted_data = await self.content_extractor.extract(url_to_crawl, content, depth)
                    else:
                        logger.warning("ContentExtractor is not initialized.")
                        # Mark URL as completed since content extractor is not available
                        if self.url_frontier:
                            await self.url_frontier.mark_completed(url_to_crawl)
                        return None
                    
                    # Add discovered links to frontier
                    if depth < self.config.max_depth:
                        unique_new_links_added = 0
                        for link in extracted_data.get('links', []):
                            resolved_url = resolve_relative_url(url_to_crawl, link)
                            if resolved_url and self._is_valid_url(resolved_url):
                                # Check if URL is already completed or seen
                                if self.url_frontier and self.bloom_filter:
                                    if not await self.url_frontier.is_url_completed(resolved_url) and \
                                       not self.bloom_filter.contains(resolved_url):
                                        priority = self._calculate_priority(resolved_url, depth + 1)
                                        added_to_frontier = await self.url_frontier.add_url(resolved_url, priority=priority, depth=depth + 1)
                                        if added_to_frontier:
                                            unique_new_links_added += 1
                                            logger.debug(f"New link added to frontier: {resolved_url}")
                                else:
                                    logger.warning("URLFrontier or BloomFilter not initialized.")
                        
                        if unique_new_links_added > 0:
                            logger.debug(f"{unique_new_links_added} new links added from {url_to_crawl}")
                    
                    return extracted_data
            else:
                logger.warning("HTTP session is not initialized.")
                # Mark URL as completed since session is not available
                if self.url_frontier:
                    await self.url_frontier.mark_completed(url_to_crawl)
                return None
                
        except asyncio.TimeoutError:
            logger.warning(f"Timeout crawling {url_to_crawl}")
            # Mark URL as failed
            if self.url_frontier:
                await self.url_frontier.mark_failed(url_to_crawl, depth)
            return None
        except Exception as e:
            logger.error(f"Error crawling {url_to_crawl}: {e}")
            # Mark URL as failed
            if self.url_frontier:
                await self.url_frontier.mark_failed(url_to_crawl, depth)
            return None

    def _is_valid_url(self, url: str) -> bool:
        """Check if URL is valid for crawling."""
        if not url:
            return False
        
        # Check excluded extensions
        for ext in self.config.excluded_extensions:
            if url.lower().endswith(ext):
                return False
        
        # Check allowed domains
        if self.config.allowed_domains:
            domain = get_domain(url)
            if not domain or domain not in self.config.allowed_domains:
                return False
        
        return True

    def _calculate_priority(self, url: str, depth: int) -> float:
        """Calculate priority for a URL."""
        base_priority = 1.0 - (depth * 0.1)  # Decrease priority with depth
        
        # Check for priority patterns
        for pattern in self.config.priority_patterns:
            if pattern.lower() in url.lower():
                base_priority += 0.2
                break
        
        return max(0.1, base_priority)

    async def worker(self, worker_id: int):
        """Worker coroutine for crawling pages."""
        logger.info(f"Worker {worker_id} started")
        
        while self.running:
            try:
                # Get next URL from frontier
                if self.url_frontier:
                    url_data = await self.url_frontier.get_url()
                    logger.debug(f"Worker {worker_id}: got url_data: {url_data}")
                else:
                    logger.warning("URLFrontier is not initialized.")
                    await asyncio.sleep(1)
                    continue
                
                if not url_data:
                    await asyncio.sleep(1)
                    continue
                
                url = url_data['url']
                depth = url_data['depth']
                
                # Check if we've reached the page limit
                if self.config.max_pages > 0 and self.pages_crawled >= self.config.max_pages:
                    logger.info(f"Reached page limit ({self.config.max_pages}), stopping worker {worker_id}")
                    break
                
                # Crawl the page
                result = await self.crawl_page(url, depth)
                
                if result:
                    self.pages_crawled += 1
                    if self.metrics:
                        self.metrics.pages_crawled += 1
                    
                    # Save or send the result
                    await self._save_document(result)
                    
                    logger.debug(f"Worker {worker_id}: Crawled {url} (depth {depth})")
                else:
                    self.errors += 1
                    if self.metrics:
                        self.metrics.errors += 1
                
                # Mark URL as completed
                if self.url_frontier:
                    await self.url_frontier.mark_completed(url)
                
                # Delay between requests
                if self.config.default_delay > 0:
                    await asyncio.sleep(self.config.default_delay)
                
            except asyncio.CancelledError:
                logger.info(f"Worker {worker_id} cancelled")
                break
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")
                self.errors += 1
                if self.metrics:
                    self.metrics.errors += 1
                await asyncio.sleep(1)
        
        logger.info(f"Worker {worker_id} finished")

    async def _save_document(self, document: Dict[str, Any]):
        """Save or send the crawled document."""
        try:
            # Add metadata
            document['crawled_at'] = datetime.now(timezone.utc).isoformat()
            document['crawler_id'] = str(uuid.uuid4())
            
            if self.config.enable_kafka_output and self.kafka_producer:
                # Send to Kafka
                self.kafka_producer.send_and_wait(
                    self.config.output_topic,
                    json.dumps(document).encode('utf-8')
                )
            elif self.config.enable_local_save:
                # Save locally
                await self._save_document_locally(document)
                
        except Exception as e:
            logger.error(f"Error saving document: {e}")

    async def _save_document_locally(self, document: Dict[str, Any]):
        """Save document to local file system."""
        try:
            output_dir = Path(self.config.local_output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Create filename based on URL hash
            url_hash = hashlib.md5(document['url'].encode()).hexdigest()
            filename = f"{url_hash}.json"
            filepath = output_dir / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(document, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            logger.error(f"Error saving document locally: {e}")

    async def run(self):
        """Start the crawler engine."""
        try:
            logger.info("Starting crawler engine...")
            
            self.running = True
            self.start_time = time.time()
            
            # Start worker tasks
            self.workers = [
                asyncio.create_task(self.worker(i))
                for i in range(self.config.workers)
            ]
            
            # Start metrics reporting
            if self.config.metrics_enabled:
                metrics_task = asyncio.create_task(self._report_metrics())
                self.workers.append(metrics_task)
            
            # Wait for workers to complete
            await asyncio.gather(*self.workers, return_exceptions=True)
            
            logger.info("Crawler engine finished")
            
        except Exception as e:
            logger.error(f"Error in crawler engine: {e}")
            raise CrawlError(f"Crawler failed: {e}")

    async def _report_metrics(self):
        """Report crawler metrics periodically."""
        while self.running:
            try:
                await asyncio.sleep(self.config.metrics_interval)
                
                uptime = time.time() - self.start_time if self.start_time else 0
                rate = self.pages_crawled / uptime if uptime > 0 else 0
                
                logger.info(f"Metrics: pages={self.pages_crawled}, errors={self.errors}, "
                          f"rate={rate:.2f} pages/sec, uptime={uptime:.1f}s")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error reporting metrics: {e}")

    async def stop(self):
        """Stop the crawler engine."""
        logger.info("Stopping crawler engine...")
        self.running = False

    async def get_status(self) -> Dict[str, Any]:
        """Get current crawler status."""
        uptime = time.time() - self.start_time if self.start_time else 0
        rate = self.pages_crawled / uptime if uptime > 0 else 0
        remaining = max(0, self.config.max_pages - self.pages_crawled) if self.config.max_pages > 0 else "Unlimited"
        
        return {
            'crawler_running': self.running,
            'uptime_seconds': round(uptime, 2),
            'pages_crawled_total': self.pages_crawled,
            'max_pages_configured': self.config.max_pages if self.config.max_pages > 0 else "Unlimited",
            'pages_remaining_in_limit': remaining,
            'avg_pages_per_second': round(rate, 2),
            'frontier_queue_size': await self.url_frontier.size() if self.url_frontier else -1,
            'urls_in_processing': await self.url_frontier.get_processing_count() if self.url_frontier else -1,
            'urls_completed_redis': await self.url_frontier.get_completed_count() if self.url_frontier else -1,
            'urls_seen_redis': await self.url_frontier.get_seen_count() if self.url_frontier else -1,
            'bloom_filter_items': self.bloom_filter.count if self.bloom_filter else -1,
            'robots_denied_count': self.robots_denied,
            'total_errors_count': self.errors,
            'active_workers_configured': self.config.workers,
            'current_time_utc': datetime.now(timezone.utc).isoformat(),
            'allowed_domains': self.config.allowed_domains or []
        } 