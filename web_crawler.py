#!/usr/bin/env python3
"""
Advanced Web Crawler with Redis-based URL Frontier, Bloom Filter, and Kafka Integration
Supports distributed crawling, rate limiting, robots.txt compliance, and comprehensive metrics.
"""

import asyncio
import aiohttp
from aiohttp import web
import logging
import time
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Set
from urllib.parse import urljoin, urlparse
import uuid
import ssl
import hashlib
from pathlib import Path
import yaml

from donutbot.crawler_config import CrawlerConfig  # Referencing updated config
from donutbot.url_frontier import URLFrontier
from donutbot.robots_checker import RobotsChecker
from donutbot.content_extractor import ContentExtractor
from donutbot.rate_limiter import RateLimiter
from donutbot.bloom_filter import BloomFilter
from donutbot.exceptions import CrawlError, RobotsError, RateLimitError
from donutbot.metrics import CrawlerMetrics
from aiokafka import AIOKafkaProducer
from donutbot.url_utils import normalize_url

import os
import sys

script_logger = logging.getLogger('WebCrawler')  

class APIServer:
    """Handles API requests for the crawler."""
    def __init__(self, crawler_instance: 'WebCrawler', host: str, port: int):
        self.crawler = crawler_instance
        self.app = web.Application(middlewares=[self.cors_middleware])
        self.host = host
        self.port = port
        self.runner = None
        self.site = None
        self.logger = logging.getLogger('web_crawler.api_server')
        self._setup_routes()

    @web.middleware
    async def cors_middleware(self, request, handler):
        response = await handler(request)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response

    def _setup_routes(self):
        self.app.router.add_post('/add_seeds', self.handle_add_seeds)
        self.app.router.add_get('/crawler_status', self.handle_crawler_status)
        self.app.router.add_get('/config/allowed_domains', self.handle_get_allowed_domains)
        self.app.router.add_post('/config/allowed_domains', self.handle_update_allowed_domains)
        self.app.router.add_post('/crawler/flush_status', self.handle_flush_crawl_status)

        # OPTIONS routes for CORS preflight
        self.app.router.add_route("OPTIONS", "/add_seeds", self.handle_options)
        self.app.router.add_route("OPTIONS", "/crawler_status", self.handle_options)
        self.app.router.add_route("OPTIONS", "/config/allowed_domains", self.handle_options)
        self.app.router.add_route("OPTIONS", "/crawler/flush_status", self.handle_options)

    async def handle_options(self, request: web.Request):
        return web.Response(
            status=200,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        )

    async def handle_add_seeds(self, request: web.Request):
        if not self.crawler or not self.crawler.running:
            return web.json_response({'error': 'Crawler is not running or not initialized.'}, status=503)
        try:
            data = await request.json()
            urls_to_add = data.get('urls')
            if not isinstance(urls_to_add, list):
                return web.json_response({'error': 'Invalid payload: "urls" must be a list.'}, status=400)

            added_count, skipped_count, invalid_count = 0, 0, 0
            normalized_and_validated_seeds = []

            for u_str in urls_to_add:
                if not isinstance(u_str, str) or not u_str.strip():
                    invalid_count += 1; continue
                norm_u = normalize_url(u_str.strip())
                parsed_u = urlparse(norm_u)
                if not parsed_u.scheme or not parsed_u.netloc:
                    self.logger.warning(f"API: Invalid seed URL: {u_str} (norm: {norm_u})")
                    invalid_count += 1; continue
                normalized_and_validated_seeds.append(norm_u)

            self.logger.info(f"API: Received {len(urls_to_add)} URLs. Validated: {len(normalized_and_validated_seeds)}")

            for seed_url in normalized_and_validated_seeds:
                try:
                    if hasattr(self.crawler, 'url_frontier') and self.crawler.url_frontier:
                        was_added = await self.crawler.url_frontier.add_url(seed_url, priority=1.0, depth=0)
                        if was_added: added_count += 1; self.logger.info(f"API: Queued new seed: {seed_url}")
                        else: skipped_count += 1; self.logger.info(f"API: Skipped seed (seen/completed): {seed_url}")
                    else:
                        self.logger.error("API: URLFrontier not available."); return web.json_response({'error': 'Crawler internal error.'}, status=500)
                except Exception as e_add:
                    self.logger.error(f"API: Error adding seed '{seed_url}': {e_add}"); skipped_count += 1
            return web.json_response({
                'message': f'{added_count} new URLs queued. {skipped_count} skipped. {invalid_count} invalid.',
                'added_count': added_count, 'skipped_count': skipped_count, 'invalid_count': invalid_count
            }, status=200)
        except json.JSONDecodeError: return web.json_response({'error': 'Invalid JSON.'}, status=400)
        except Exception as e:
            self.logger.error(f"API /add_seeds error: {e}", exc_info=True)
            return web.json_response({'error': f'Internal error: {str(e)}'}, status=500)

    async def handle_crawler_status(self, request: web.Request):
        if not self.crawler: return web.json_response({'error': 'Crawler not initialized.'}, status=503)
        try:
            metrics, frontier, config = self.crawler.metrics, self.crawler.url_frontier, self.crawler.config
            uptime = time.time() - self.crawler.start_time if self.crawler.start_time else 0
            rate = metrics.pages_crawled / uptime if uptime > 0 else 0
            remaining = "N/A"
            if config.max_pages > 0: remaining = max(0, config.max_pages - metrics.pages_crawled)

            status_data = {
                'crawler_running': self.crawler.running, 'uptime_seconds': round(uptime, 2),
                'pages_crawled_total': metrics.pages_crawled,
                'max_pages_configured': config.max_pages if config.max_pages > 0 else "Unlimited",
                'pages_remaining_in_limit': remaining, 'avg_pages_per_second': round(rate, 2),
                'frontier_queue_size': await frontier.size() if frontier else -1,
                'urls_in_processing': await frontier.get_processing_count() if frontier else -1,
                'urls_completed_redis': await frontier.get_completed_count() if frontier else -1,
                'urls_seen_redis': await frontier.get_seen_count() if frontier else -1,
                'bloom_filter_items': self.crawler.bloom_filter.count if self.crawler.bloom_filter and hasattr(self.crawler.bloom_filter, 'count') else -1,
                'robots_denied_count': metrics.robots_denied, 'total_errors_count': metrics.errors,
                'active_workers_configured': config.workers,
                'current_time_utc': datetime.now(timezone.utc).isoformat(),
                'allowed_domains': config.allowed_domains or []
            }
            return web.json_response(status_data, status=200)
        except Exception as e:
            self.logger.error(f"API /crawler_status error: {e}", exc_info=True)
            return web.json_response({'error': f'Internal error: {str(e)}'}, status=500)

    async def handle_get_allowed_domains(self, request: web.Request):
        if not self.crawler:
            return web.json_response({'error': 'Crawler not initialized.'}, status=503)
        try:
            allowed_domains = self.crawler.config.allowed_domains
            return web.json_response({'allowed_domains': allowed_domains or []}, status=200)
        except Exception as e:
            self.logger.error(f"API /config/allowed_domains (GET) error: {e}", exc_info=True)
            return web.json_response({'error': f'Internal error: {str(e)}'}, status=500)

    async def handle_update_allowed_domains(self, request: web.Request):
        if not self.crawler:
            return web.json_response({'error': 'Crawler not initialized.'}, status=503)
        try:
            data = await request.json()
            action = data.get('action')
            domains_payload = data.get('domains')

            if not isinstance(domains_payload, list) or not all(isinstance(d, str) for d in domains_payload):
                return web.json_response({'error': 'Invalid payload: "domains" must be a list of strings.'}, status=400)
            if action not in ['add', 'remove', 'replace']:
                return web.json_response({'error': 'Invalid action. Must be "add", "remove", or "replace".'}, status=400)

            if self.crawler.config.allowed_domains is None:
                self.crawler.config.allowed_domains = []

            current_allowed_domains_set = set(self.crawler.config.allowed_domains)
            domains_to_process = set(d.lower().strip() for d in domains_payload if d.strip())
            original_count = len(current_allowed_domains_set)

            if action == 'add':
                current_allowed_domains_set.update(domains_to_process)
                added_count = len(current_allowed_domains_set) - original_count
                message = f"Added {added_count} unique domains."
            elif action == 'remove':
                current_allowed_domains_set.difference_update(domains_to_process)
                removed_count = original_count - len(current_allowed_domains_set)
                message = f"Removed {removed_count} domains."
            elif action == 'replace':
                current_allowed_domains_set = domains_to_process
                message = f"Replaced allowed domains list with {len(current_allowed_domains_set)} domains."
            
            self.crawler.config.allowed_domains = sorted(list(current_allowed_domains_set))
            self.logger.info(f"API: Allowed domains updated. Action: {action}. Domains affected: {domains_to_process}. New list: {self.crawler.config.allowed_domains}")
            
            return web.json_response({
                'message': message,
                'allowed_domains': self.crawler.config.allowed_domains
            }, status=200)

        except json.JSONDecodeError:
            return web.json_response({'error': 'Invalid JSON.'}, status=400)
        except Exception as e:
            self.logger.error(f"API /config/allowed_domains (POST) error: {e}", exc_info=True)
            return web.json_response({'error': f'Internal error: {str(e)}'}, status=500)

    async def handle_flush_crawl_status(self, request: web.Request):
        if not self.crawler:
            return web.json_response({'error': 'Crawler not initialized.'}, status=503)
        try:
            data = await request.json() if request.can_read_body and request.content_type == 'application/json' else {}

            clear_redis_completed = data.get('redis_completed', True)
            clear_redis_seen = data.get('redis_seen', True)
            clear_redis_processing = data.get('redis_processing', False)
            clear_redis_queue = data.get('redis_queue', False)
            clear_bloom = data.get('bloom_filter', True)

            self.logger.info(f"API: Received flush_crawl_status request. Payload: {data}")

            report = await self.crawler.reset_crawl_status(
                clear_redis_completed=clear_redis_completed,
                clear_redis_seen=clear_redis_seen,
                clear_redis_processing=clear_redis_processing,
                clear_redis_queue=clear_redis_queue,
                clear_bloom_filter=clear_bloom
            )
            
            return web.json_response({
                'message': 'Crawl status flush process initiated.',
                'details': report
            }, status=200)
            
        except json.JSONDecodeError:
            return web.json_response({'error': 'Invalid JSON in request for flush_crawl_status.'}, status=400)
        except Exception as e:
            self.logger.error(f"API /crawler/flush_status error: {e}", exc_info=True)
            return web.json_response({'error': f'Internal error: {str(e)}'}, status=500)

    async def start(self):
        self.runner = web.AppRunner(self.app)
        await self.runner.setup()
        self.site = web.TCPSite(self.runner, self.host, self.port)
        try:
            await self.site.start()
            self.logger.info(f"API Server started at http://{self.host}:{self.port}")
        except OSError as e:
            self.logger.error(f"Failed to start API server on {self.host}:{self.port}: {e}")
            self.site = None; raise CrawlError(f"API Server could not start: {e}")

    async def stop(self):
        if self.site: await self.site.stop(); self.logger.info("API Server site stopped.")
        if self.runner: await self.runner.cleanup(); self.logger.info("API Server runner cleaned up.")
        self.logger.info("API Server fully stopped.")


class WebCrawler:
    def __init__(self, config: CrawlerConfig):
        self.config = config
        self.logger = logging.getLogger('web_crawler.instance')
        
        self.rate_limiter = RateLimiter(config)
        self.robots_checker = RobotsChecker(config, self.rate_limiter)
        self.url_frontier = URLFrontier(config)
        self.content_extractor = ContentExtractor()
        self.bloom_filter = BloomFilter(capacity=config.bloom_capacity, error_rate=config.bloom_error_rate)
        self.metrics = CrawlerMetrics()
        
        self.producer: Optional[AIOKafkaProducer] = None
        self.session: Optional[aiohttp.ClientSession] = None
        
        self.running = False
        self.start_time: Optional[float] = None
        self.pages_crawled_count = 0
        self.local_output_path: Optional[Path] = None

    async def initialize(self):
        self.logger.info("Initializing crawler core components...")
        self.start_time = time.time()
        self.running = True
        
        try:
            await self.url_frontier.initialize()
            self.logger.info("URL frontier initialized.")
        except Exception as e:
            self.logger.error(f"Failed to initialize URL frontier: {e}", exc_info=True)
            self.running = False; raise CrawlError(f"URL frontier init failed: {e}")

        if self.config.enable_kafka_output:
            try:
                self.producer = AIOKafkaProducer(
                    bootstrap_servers=self.config.kafka_brokers,
                    value_serializer=lambda v: json.dumps(v, default=str).encode('utf-8'),
                    compression_type='gzip'
                )
                await self.producer.start()
                self.logger.info(f"Kafka producer initialized for brokers: {self.config.kafka_brokers}")
            except Exception as e:
                self.logger.error(f"Failed to initialize Kafka producer: {e}", exc_info=True)
                if not self.config.enable_local_save:
                    self.running = False; raise CrawlError(f"Kafka init failed and no alternative output (local save) is enabled: {e}")
                else:
                    self.logger.warning("Kafka producer failed to initialize. Will proceed with local save only (if enabled).")
                    self.config.enable_kafka_output = False
        else:
            self.logger.info("Kafka output is disabled by configuration.")

        if self.config.enable_local_save:
            self.local_output_path = Path(self.config.local_output_dir)
            try:
                self.local_output_path.mkdir(parents=True, exist_ok=True)
                self.logger.info(f"Local output directory prepared: {self.local_output_path.resolve()}")
            except Exception as e_dir:
                self.logger.error(f"Failed to create local output directory {self.local_output_path}: {e_dir}. Disabling local saving.")
                self.config.enable_local_save = False
        else:
            self.logger.info("Local file saving is disabled by configuration.")
        
        session_headers = self.config.additional_headers.copy()
        session_headers['User-Agent'] = self.config.user_agent
        timeout = aiohttp.ClientTimeout(total=self.config.request_timeout)
        
        ssl_context = None
        if self.config.ssl_verification_enabled:
            ssl_context = ssl.create_default_context()
            if self.config.custom_ca_bundle:
                try:
                    ssl_context.load_verify_locations(self.config.custom_ca_bundle)
                    self.logger.info(f"Loaded custom CA bundle from: {self.config.custom_ca_bundle}")
                except FileNotFoundError:
                    self.logger.error(f"Custom CA bundle not found: {self.config.custom_ca_bundle}. Using default CAs.")
                except ssl.SSLError as e:
                    self.logger.error(f"Error loading custom CA bundle: {e}. Using default CAs.")
        else:
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            self.logger.warning("SSL verification is DISABLED. This is insecure for production.")

        connector = aiohttp.TCPConnector(limit=self.config.max_connections, ssl=ssl_context)
        self.session = aiohttp.ClientSession(timeout=timeout, connector=connector, headers=session_headers)
        self.logger.info(f"HTTP session initialized. SSL Verification: {self.config.ssl_verification_enabled}")
        self.logger.debug(f"Session headers: {session_headers}")

        await self.robots_checker.initialize()
        self.logger.info("RobotsChecker initialized.")
        
        await self._load_seed_urls()
        try:
            frontier_size = await self.url_frontier.size()
            self.logger.info(f"Seed loading complete. Initial URL frontier size: {frontier_size}")
            if frontier_size == 0 and not self.config.seed_urls and not self.config.seed_urls_file:
                 self.logger.warning("No seed URLs were provided or found.")
            elif frontier_size == 0:
                self.logger.warning("URL frontier empty after seed loading. Check config/seeds.")
        except Exception as e:
            self.logger.error(f"Failed to get URL frontier size post-seed: {e}", exc_info=True)

    async def close(self):
        self.logger.info("Initiating crawler shutdown sequence...")
        self.running = False
        await asyncio.sleep(0.1)
        if self.session and not self.session.closed:
            await self.session.close(); self.logger.info("Main HTTP session closed.")
        if self.producer:
            try: await self.producer.stop(); self.logger.info("Kafka producer stopped.")
            except Exception as e_kafka_stop: self.logger.error(f"Error stopping Kafka: {e_kafka_stop}")
        await self.robots_checker.close(); self.logger.info("RobotsChecker resources closed.")
        if self.url_frontier: await self.url_frontier.close(); self.logger.info("URL frontier closed.")
        
        elapsed = time.time() - (self.start_time if self.start_time else time.time())
        rate = self.metrics.pages_crawled / elapsed if elapsed > 0 else 0
        completed_redis_count = -1
        if self.url_frontier and self.url_frontier.redis:
            try: completed_redis_count = await self.url_frontier.get_completed_count()
            except Exception: pass
        self.logger.info(
            f"Crawler stats: Crawled {self.metrics.pages_crawled}, Elapsed {elapsed:.2f}s, Rate {rate:.2f} p/s, "
            f"Errors: {self.metrics.errors}, Robots Denied: {self.metrics.robots_denied}, "
            f"Redis Completed: {completed_redis_count}"
        )
        self.logger.info("Crawler shutdown sequence complete.")

    async def _save_document_locally(self, document_payload: Dict[str, Any]):
        if not self.config.enable_local_save or not self.local_output_path:
            return
        try:
            url_for_filename = document_payload.get('url', str(uuid.uuid4()))
            filename_hash = hashlib.md5(normalize_url(url_for_filename).encode('utf-8')).hexdigest()
            output_file = self.local_output_path / f"{filename_hash}.json"
            await asyncio.to_thread(output_file.write_text, json.dumps(document_payload, indent=2), encoding='utf-8')
            self.logger.debug(f"Document saved locally: {output_file.name} for URL {document_payload.get('url')}")
        except Exception as e_save:
            self.logger.error(f"Failed to save document locally for URL {document_payload.get('url')}: {e_save}", exc_info=True)

    async def _load_seed_urls(self):
        self.logger.info("Loading seed URLs into frontier...")
        urls_added_count = 0; processed_seeds: Set[str] = set(); seed_sources = []
        if self.config.seed_urls: seed_sources.extend(self.config.seed_urls)
        if self.config.seed_urls_file:
            self.logger.info(f"Attempting to load seeds from file: {self.config.seed_urls_file}")
            try:
                with open(self.config.seed_urls_file, 'r') as f:
                    for line in f: url = line.strip(); _= url and not url.startswith('#') and seed_sources.append(url)
            except FileNotFoundError: self.logger.error(f"Seed URLs file not found: {self.config.seed_urls_file}")
            except Exception as e: self.logger.error(f"Error loading seeds from file '{self.config.seed_urls_file}': {e}", exc_info=True)
        if not seed_sources: self.logger.warning("No seed URLs found to load."); return
        self.logger.info(f"Processing {len(seed_sources)} raw seed URLs.")
        for raw_seed_url in seed_sources:
            if not raw_seed_url or not isinstance(raw_seed_url, str): self.logger.warning(f"Skipping invalid seed: {raw_seed_url}"); continue
            normalized_seed = normalize_url(raw_seed_url)
            if not normalized_seed: self.logger.warning(f"Skipping unnormalizable seed: {raw_seed_url}"); continue
            if normalized_seed in processed_seeds: self.logger.debug(f"Skipping duplicate seed: {normalized_seed}"); continue
            processed_seeds.add(normalized_seed)
            parsed_url = urlparse(normalized_seed)
            if not parsed_url.scheme or not parsed_url.netloc: self.logger.warning(f"Normalized seed '{normalized_seed}' invalid. Skipping."); continue
            try:
                added = await self.url_frontier.add_url(normalized_seed, priority=1.0, depth=0)
                if added: self.logger.debug(f"Added seed: {normalized_seed}"); urls_added_count += 1
            except Exception as e: self.logger.error(f"Failed to add seed '{normalized_seed}': {e}", exc_info=True)
        if urls_added_count > 0: self.logger.info(f"{urls_added_count} new seed URLs added to frontier.")
        else: self.logger.warning("No new seed URLs added (duplicates or invalid).")

    async def crawl_page(self, url_to_crawl: str, depth: int = 0) -> Optional[Dict[str, Any]]:
        if self.config.max_pages > 0 and self.metrics.pages_crawled >= self.config.max_pages:
            if self.running: self.logger.info(f"Max pages ({self.config.max_pages}) reached.")
            self.running = False; return None

        current_normalized_url = normalize_url(url_to_crawl)
        page_fetch_timestamp = datetime.now(timezone.utc)

        try:
            if await self.url_frontier.is_url_completed(current_normalized_url):
                self.logger.debug(f"URL already completed (Redis): {current_normalized_url}")
                await self.url_frontier.redis.srem(self.url_frontier.processing_urls_key, current_normalized_url)
                return None
            if self.bloom_filter.contains(current_normalized_url):
                self.logger.debug(f"URL already processed (Bloom): {current_normalized_url}"); return None
            if not await self.robots_checker.can_fetch(self.config.user_agent, current_normalized_url):
                self.logger.info(f"Robots.txt disallows: {current_normalized_url}")
                self.metrics.robots_denied += 1
                await self.url_frontier.mark_completed(current_normalized_url); self.bloom_filter.add(current_normalized_url); return None
            
            domain = urlparse(current_normalized_url).netloc
            await self.rate_limiter.wait(domain)
            self.logger.debug(f"Fetching: {current_normalized_url}")
            
            async with self.session.get(current_normalized_url, allow_redirects=self.config.allow_redirects) as response:
                final_url_after_redirects = normalize_url(str(response.url))
                response_headers, response_status = dict(response.headers), response.status
                self.logger.debug(f"Response for {current_normalized_url} (final: {final_url_after_redirects}): HTTP {response_status}")

                if current_normalized_url != final_url_after_redirects and await self.url_frontier.is_url_completed(final_url_after_redirects):
                    self.logger.info(f"Redirect to completed URL '{final_url_after_redirects}'. Original: {current_normalized_url}")
                    await self.url_frontier.mark_completed(current_normalized_url); self.bloom_filter.add(current_normalized_url); return None
                
                self.bloom_filter.add(current_normalized_url)
                if current_normalized_url != final_url_after_redirects: self.bloom_filter.add(final_url_after_redirects)
                
                content_type_header = response_headers.get('Content-Type', '').lower()
                if not any(ct in content_type_header for ct in self.config.allowed_content_types):
                    self.logger.info(f"Skipped (disallowed type '{content_type_header}'): {final_url_after_redirects}")
                    await self.url_frontier.mark_completed(final_url_after_redirects); return None
                
                html_content = await response.text(errors='replace')
                content_size = len(html_content.encode('utf-8'))
                if content_size > self.config.max_content_size:
                    self.logger.info(f"Skipped (too large {content_size}B): {final_url_after_redirects}")
                    await self.url_frontier.mark_completed(final_url_after_redirects); return None
                
                extraction_result = self.content_extractor.extract(html_content, final_url_after_redirects)
                self.metrics.pages_crawled += 1
                if self.config.max_pages > 0: self.pages_crawled_count += 1
                self.metrics.total_bytes += content_size
                
                document_payload = {
                    'url': final_url_after_redirects, 'fetched_at': page_fetch_timestamp.isoformat(),
                    'content_type': content_type_header, 'content': html_content,
                    'links': extraction_result.get('links', []), 'headers': response_headers,
                    'status_code': response_status,
                    'original_request_url': current_normalized_url if current_normalized_url != final_url_after_redirects else None,
                    'crawl_depth': depth, 'title': extraction_result.get('title'),
                    'meta_description': extraction_result.get('meta_description'),
                    'meta_keywords': extraction_result.get('meta_keywords'),
                    'h1_tags': extraction_result.get('h1_tags', []),
                }
                if document_payload['original_request_url'] is None: del document_payload['original_request_url']

                output_attempted = False
                output_succeeded_somewhere = False

                if self.config.enable_kafka_output:
                    output_attempted = True
                    if self.producer:
                        try:
                            await self.producer.send_and_wait(self.config.output_topic, document_payload)
                            self.logger.debug(f"Sent to Kafka: {final_url_after_redirects}")
                            output_succeeded_somewhere = True
                        except Exception as e_kafka:
                            self.logger.error(f"Failed to send to Kafka for {final_url_after_redirects}: {e_kafka}", exc_info=True)
                            self.metrics.errors += 1
                    else:
                        self.logger.warning(f"Kafka output enabled, but producer not available for {final_url_after_redirects}. Data not sent to Kafka.")
                
                elif self.config.enable_local_save:
                    output_attempted = True
                    await self._save_document_locally(document_payload)
                    output_succeeded_somewhere = True
                
                if output_attempted and not output_succeeded_somewhere:
                     self.logger.warning(f"Document for {final_url_after_redirects} processed but failed to persist to configured output.")
                
                await self.url_frontier.mark_completed(final_url_after_redirects)
                if current_normalized_url != final_url_after_redirects:
                    await self.url_frontier.mark_completed(current_normalized_url)

                if depth < self.config.max_depth:
                    unique_new_links_added = 0
                    for extracted_link in extraction_result.get('links', []):
                        abs_link = urljoin(final_url_after_redirects, extracted_link)
                        norm_abs_link = normalize_url(abs_link)
                        if self._is_valid_url(norm_abs_link):
                            if not await self.url_frontier.is_url_completed(norm_abs_link) and \
                               not self.bloom_filter.contains(norm_abs_link):
                                priority = self._calculate_priority(norm_abs_link, depth + 1)
                                added_to_frontier = await self.url_frontier.add_url(norm_abs_link, priority=priority, depth=depth + 1)
                                if added_to_frontier: unique_new_links_added += 1; self.logger.debug(f"New link to frontier: {norm_abs_link}")
                        else: self.logger.trace(f"Skipping invalid discovered link: {extracted_link} (abs: {norm_abs_link})")
                    if unique_new_links_added > 0: self.logger.debug(f"{unique_new_links_added} new links added from {final_url_after_redirects}")
                return document_payload

        except aiohttp.ClientError as e:
            self.logger.warning(f"HTTP client error for {current_normalized_url}: {type(e).__name__} - {str(e)}"); self.metrics.errors += 1
            await self.url_frontier.mark_failed(current_normalized_url, depth, original_url=url_to_crawl)
            self.bloom_filter.add(current_normalized_url); return None
        except RobotsError as e_robots:
            self.logger.warning(f"Robots.txt error for {current_normalized_url}: {e_robots}"); self.metrics.robots_denied += 1
            await self.url_frontier.mark_completed(current_normalized_url)
            self.bloom_filter.add(current_normalized_url); return None
        except asyncio.TimeoutError:
            self.logger.warning(f"Timeout fetching {current_normalized_url}"); self.metrics.errors += 1
            await self.url_frontier.mark_failed(current_normalized_url, depth, original_url=url_to_crawl)
            self.bloom_filter.add(current_normalized_url); return None
        except Exception as e_general:
            self.logger.error(f"Error crawling {current_normalized_url}: {type(e_general).__name__} - {str(e_general)}", exc_info=self.logger.isEnabledFor(logging.DEBUG))
            self.metrics.errors += 1
            await self.url_frontier.mark_failed(current_normalized_url, depth, original_url=url_to_crawl)
            self.bloom_filter.add(current_normalized_url); return None

    def _is_valid_url(self, url: str) -> bool:
        if not url: return False
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ['http', 'https']:
                self.logger.trace(f"Invalid scheme: {url}"); return False
            if not parsed.netloc:
                self.logger.trace(f"Invalid URL (no netloc): {url}"); return False

            current_allowed_domains = self.config.allowed_domains
            if current_allowed_domains:
                netloc_lower = parsed.netloc.lower()
                if not any(ad.lower() in netloc_lower for ad in current_allowed_domains if ad):
                    self.logger.trace(f"Domain not allowed: {url} ({netloc_lower}) vs {current_allowed_domains}"); return False
            
            path_lower = parsed.path.lower() if parsed.path else ""
            if any(path_lower.endswith(ext) for ext in self.config.excluded_extensions if ext):
                self.logger.trace(f"Excluded extension: {url}"); return False
            return True
        except Exception as e: self.logger.trace(f"URL validation error {url}: {e}"); return False

    def _calculate_priority(self, url: str, depth: int) -> float:
        priority = 1.0 - (depth * 0.1)
        if any(p.lower() in url.lower() for p in self.config.priority_patterns): priority += 0.5
        return max(0.01, min(1.5, priority))

    async def worker(self, worker_id: int):
        self.logger.info(f"Worker {worker_id} started.")
        try:
            while self.running:
                if self.config.max_pages > 0 and self.metrics.pages_crawled >= self.config.max_pages:
                    if self.running: self.running = False; break
                
                url_info_dict = await self.url_frontier.get_url()
                if url_info_dict is None:
                    if not self.running: break
                    await asyncio.sleep(0.1); continue
                
                norm_url, depth = url_info_dict['url'], url_info_dict['depth']
                self.logger.debug(f"W:{worker_id} picked: {norm_url} (D:{depth})")
                payload = await self.crawl_page(norm_url, depth)
                if payload: self.logger.info(f"Crawled ({self.metrics.pages_crawled}{('/'+str(self.config.max_pages)) if self.config.max_pages > 0 else ''}): {payload['url']} (W:{worker_id},D:{depth})")
                await asyncio.sleep(0.001)
        except asyncio.CancelledError: self.logger.info(f"Worker {worker_id} cancelled.")
        except Exception as e: self.logger.error(f"W:{worker_id} error: {e}", exc_info=self.logger.isEnabledFor(logging.DEBUG)); self.metrics.errors += 1
        finally: self.logger.info(f"Worker {worker_id} stopping.")

    async def run(self):
        if not self.running and self.start_time is None: self.start_time = time.time(); self.running = True
        
        if not self.config.allowed_domains and (self.config.seed_urls or self.config.seed_urls_file):
            temp_seeds = []; initial_domains = set()
            if self.config.seed_urls: temp_seeds.extend(self.config.seed_urls)
            if self.config.seed_urls_file:
                try:
                    with open(self.config.seed_urls_file, 'r') as f:
                        for line in f: url = line.strip(); _= url and not url.startswith('#') and temp_seeds.append(url)
                except Exception: pass
            if temp_seeds:
                for s_url in temp_seeds:
                    norm_s = normalize_url(s_url)
                    try: p_s = urlparse(norm_s); _= p_s.netloc and initial_domains.add(p_s.netloc.lower())
                    except Exception: continue
                if initial_domains:
                    self.config.allowed_domains = sorted(list(initial_domains))
                    self.logger.info(f"Dynamically set allowed_domains from initial seeds: {self.config.allowed_domains}")

        initial_q_size = await self.url_frontier.size()
        if initial_q_size == 0 and not (self.config.seed_urls or self.config.seed_urls_file):
            self.logger.warning("Crawler starting with an empty queue and no initial seed URLs configured via file/direct_list.")
            if self.config.max_pages > 0:
                 self.logger.error("Exiting: No seeds provided and max_pages > 0. Add seeds via API or config.")
                 self.running = False; return

        self.logger.info(f"Starting crawl. Workers:{self.config.workers}, Depth:{self.config.max_depth}, MaxPages:{self.config.max_pages if self.config.max_pages > 0 else 'Unlimited'}")
        if self.config.allowed_domains: self.logger.info(f"Allowed domains: {self.config.allowed_domains}")
        else: self.logger.info("No domain restrictions (allowed_domains is empty/None).")

        metrics_task = asyncio.create_task(self._report_metrics())
        worker_tasks = [asyncio.create_task(self.worker(i)) for i in range(self.config.workers)]
        self.logger.info(f"Launched {len(worker_tasks)} workers.")
        try:
            while self.running:
                await asyncio.sleep(1)
                q_s, p_s = await self.url_frontier.size(), await self.url_frontier.get_processing_count()
                if self.config.max_pages > 0 and self.metrics.pages_crawled >= self.config.max_pages :
                    self.logger.info(f"Max pages ({self.config.max_pages}) reached. Shutting down."); self.running = False; break
                if q_s == 0 and p_s == 0:
                    self.logger.info("Frontier queue and processing set are empty. Checking for crawl completion...");
                    await asyncio.sleep(1.5)
                    q_s_check, p_s_check = await self.url_frontier.size(), await self.url_frontier.get_processing_count()
                    if q_s_check == 0 and p_s_check == 0:
                        if self.metrics.pages_crawled > 0 or not (self.config.seed_urls or self.config.seed_urls_file or await self.url_frontier.get_completed_count() > 0):
                            self.logger.info("Confirmed empty frontier. Crawl considered complete."); self.running = False; break
                        else:
                            self.logger.warning("Frontier empty, but no pages seem to have been crawled and seeds were configured/expected. Check seed validity, robots.txt, or network issues.")
            
            if worker_tasks: self.logger.info("Waiting for worker tasks to complete..."); await asyncio.gather(*worker_tasks, return_exceptions=True); self.logger.info("All worker tasks finished.")
        except KeyboardInterrupt: self.logger.info("Run interrupted by user (KeyboardInterrupt)."); self.running = False
        except Exception as e: self.logger.error(f"Unexpected error in main run loop: {e}", exc_info=self.logger.isEnabledFor(logging.DEBUG)); self.running = False
        finally:
            self.logger.info("Run loop ending. Initiating cleanup of tasks..."); self.running = False
            if metrics_task and not metrics_task.done(): metrics_task.cancel()
            
            active_workers_to_cancel = []
            for i, task in enumerate(worker_tasks):
                if task and not task.done():
                    task.cancel()
                    active_workers_to_cancel.append(task)
            
            if active_workers_to_cancel:
                self.logger.info(f"Cancelling {len(active_workers_to_cancel)} active worker tasks...");
                await asyncio.gather(*active_workers_to_cancel, return_exceptions=True)
                self.logger.info("Active worker tasks cancelled.")
            
            if metrics_task:
                try:
                    await metrics_task
                except asyncio.CancelledError:
                    self.logger.info("Metrics task successfully cancelled.")
                except Exception as e_mt:
                    self.logger.error(f"Error during metrics task cleanup: {e_mt}")
            self.logger.info("All associated tasks (workers, metrics) have been processed for shutdown.")

    async def _report_metrics(self):
        self.logger.info("Metrics reporting task started.")
        idle_reports_at_empty_q = 0
        last_crawled_count = -1
        
        while self.running:
            sleep_duration = self.config.metrics_interval
            if self.config.max_pages > 0:
                pages_left = self.config.max_pages - self.metrics.pages_crawled
                if 0 < pages_left < (self.config.workers * 2):
                    sleep_duration = min(sleep_duration, 5.0)
            
            await asyncio.sleep(sleep_duration)
            if not self.running: break

            elapsed_time = time.time() - (self.start_time if self.start_time else time.time())
            current_crawled = self.metrics.pages_crawled
            rate = current_crawled / elapsed_time if elapsed_time > 0 else 0
            
            try:
                q_size = await self.url_frontier.size()
                p_count = await self.url_frontier.get_processing_count()
                c_count_redis = await self.url_frontier.get_completed_count()
            except Exception as e_redis_metrics:
                q_size, p_count, c_count_redis = -1, -1, -1
                self.logger.error(f"Metrics: Error accessing Redis for stats: {e_redis_metrics}")

            self.logger.info(
                f"Status - Crawled:{current_crawled}{('/'+str(self.config.max_pages)) if self.config.max_pages > 0 else ''}, "
                f"Q:{q_size}, P:{p_count}, C(R):{c_count_redis}, Errors:{self.metrics.errors}, Rate:{rate:.2f} p/s, "
                f"Robots Denied: {self.metrics.robots_denied}"
            )

            if q_size == 0 and p_count == 0:
                if current_crawled == last_crawled_count and current_crawled > 0:
                    idle_reports_at_empty_q += 1
                    if idle_reports_at_empty_q >= self.config.idle_shutdown_threshold:
                        self.logger.info(f"Metrics: Frontier empty and idle for {idle_reports_at_empty_q * sleep_duration:.0f}s. Initiating shutdown.")
                        self.running = False
                        break 
                elif current_crawled == 0 and last_crawled_count == -1 and not (self.config.seed_urls or self.config.seed_urls_file):
                    idle_reports_at_empty_q += 1
                    if idle_reports_at_empty_q >= self.config.idle_shutdown_threshold + 2:
                        self.logger.warning("Metrics: Idle from start, no seeds, empty frontier. Shutting down.")
                        self.running = False; break
                else:
                    idle_reports_at_empty_q = 0
            else:
                idle_reports_at_empty_q = 0
            
            last_crawled_count = current_crawled
        self.logger.info("Metrics reporting task stopped.")

    async def reset_crawl_status(self,
                                 clear_redis_completed: bool = True,
                                 clear_redis_seen: bool = True,
                                 clear_redis_processing: bool = False,
                                 clear_redis_queue: bool = False,
                                 clear_bloom_filter: bool = True) -> Dict[str, Any]:
        self.logger.info(
            f"Initiating crawl status reset: Redis(Completed={clear_redis_completed}, "
            f"Seen={clear_redis_seen}, Processing={clear_redis_processing}, Queue={clear_redis_queue}), "
            f"BloomFilter={clear_bloom_filter}"
        )
        report: Dict[str, Any] = {}

        if self.url_frontier:
            try:
                if hasattr(self.url_frontier, 'clear_specific_data') and callable(getattr(self.url_frontier, 'clear_specific_data')):
                    redis_clear_report = await self.url_frontier.clear_specific_data(
                        clear_completed=clear_redis_completed,
                        clear_seen=clear_redis_seen,
                        clear_processing=clear_redis_processing,
                        clear_queue=clear_redis_queue
                    )
                    self.logger.info(f"URLFrontier data cleared: {redis_clear_report}")
                    report['redis_clear_status'] = redis_clear_report
                else:
                    self.logger.error("URLFrontier 'clear_specific_data' method not found.")
                    report['redis_clear_status'] = {'error': "URLFrontier 'clear_specific_data' method not found."}
            except Exception as e:
                self.logger.error(f"Error clearing URLFrontier data: {e}", exc_info=True)
                report['redis_clear_status'] = {'error': str(e)}
        else:
            report['redis_clear_status'] = {'message': "URLFrontier not available."}

        if clear_bloom_filter and self.bloom_filter:
            try:
                if hasattr(self.bloom_filter, 'clear') and callable(getattr(self.bloom_filter, 'clear')):
                    self.bloom_filter.clear()
                    self.logger.info("In-memory Bloom filter has been cleared.")
                    report['bloom_filter_status'] = "Cleared"
                else:
                    self.logger.warning("BloomFilter 'clear' method not found or not callable. Re-initializing.")
                    bf_capacity = getattr(self.bloom_filter, 'capacity', self.config.bloom_capacity)
                    bf_error_rate = getattr(self.bloom_filter, 'error_rate', self.config.bloom_error_rate)
                    self.bloom_filter = BloomFilter(capacity=bf_capacity, error_rate=bf_error_rate)
                    self.logger.info(f"Bloom filter re-initialized (capacity: {bf_capacity}, error_rate: {bf_error_rate}).")
                    report['bloom_filter_status'] = "Re-initialized (clear method missing)"
            except Exception as e:
                self.logger.error(f"Error clearing BloomFilter: {e}", exc_info=True)
                report['bloom_filter_status'] = {'error': str(e)}
        elif clear_bloom_filter:
            report['bloom_filter_status'] = "Bloom filter not configured or available."
        else:
            report['bloom_filter_status'] = "Clearing not requested."

        self.logger.info("Crawl status reset process completed.")
        return report


async def main():
    import argparse
    parser = argparse.ArgumentParser(description='Asynchronous Web Crawler Service with API')
    parser.add_argument('--config', default=os.getenv('CRAWLER_CONFIG_FILE', '/app/configs/config.yaml'), help='Path to YAML configuration file.')
    parser.add_argument('--log-level', default=os.getenv('CRAWLER_LOG_LEVEL', 'INFO'), choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL', 'TRACE'], help='Logging level.')
    parser.add_argument('--seed-urls', nargs='*', default=None, help='List of seed URLs.')
    parser.add_argument('--seed-urls-file', default=None, help='Path to a file containing seed URLs.')
    parser.add_argument('--workers', type=int, default=None)
    parser.add_argument('--max-depth', type=int, default=None)
    parser.add_argument('--max-pages', type=int, default=None, help="Max pages (0 for unlimited).")
    parser.add_argument('--default-delay', type=float, default=None)
    parser.add_argument('--user-agent', type=str, default=None)
    parser.add_argument('--respect-robots-txt', action=argparse.BooleanOptionalAction, default=None, help="Respect robots.txt.")
    parser.add_argument('--allow-redirects', action=argparse.BooleanOptionalAction, default=None, help="Allow HTTP redirects.")
    parser.add_argument('--allowed-domains', nargs='*', default=None, help='Explicitly set allowed domains.')
    parser.add_argument('--api-host', type=str, default=None)
    parser.add_argument('--api-port', type=int, default=None, help="Port for the API server.")
    parser.add_argument('--kafka-brokers', type=str, default=None)
    parser.add_argument('--output-topic', type=str, default=None)
    parser.add_argument('--redis-host', type=str, default=None)
    parser.add_argument('--redis-port', type=int, default=None)
    parser.add_argument('--redis-db', type=int, default=None)
    parser.add_argument('--redis-password', type=str, default=None)
    parser.add_argument('--enable-local-save', action=argparse.BooleanOptionalAction, default=None, help="Enable saving crawled documents locally.")
    parser.add_argument('--local-output-dir', type=str, default=None, help="Directory for locally saved documents.")
    parser.add_argument('--enable-kafka-output', action=argparse.BooleanOptionalAction, default=None, help="Enable sending documents to Kafka.")

    args = parser.parse_args()

    # Logging setup
    logging.addLevelName(5, "TRACE")
    def trace_logger_method(self, message, *args, **kws):
        if self.isEnabledFor(5):
            self._log(5, message, args, **kws)
    logging.Logger.trace = trace_logger_method

    log_file_path = './crawler.log'; os.makedirs(os.path.dirname(log_file_path), exist_ok=True)
    root_logger = logging.getLogger()
    try:
        effective_log_level_str = args.log_level.upper()
        effective_log_level = getattr(logging, effective_log_level_str) if effective_log_level_str != "TRACE" else 5
    except AttributeError:
        print(f"Warning: Invalid log level '{args.log_level}'. Defaulting to INFO.")
        effective_log_level_str = "INFO"
        effective_log_level = logging.INFO
    
    root_logger.setLevel(effective_log_level)
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s - %(message)s'; formatter = logging.Formatter(log_format)
    if root_logger.hasHandlers(): root_logger.handlers.clear()
    
    stream_handler = logging.StreamHandler(sys.stdout); stream_handler.setFormatter(formatter)
    if effective_log_level <= logging.DEBUG or not log_file_path:
        root_logger.addHandler(stream_handler)

    if log_file_path:
        file_handler = logging.FileHandler(log_file_path, mode='a'); file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    logging.getLogger('aiokafka').setLevel(logging.WARNING); logging.getLogger('aioredis').setLevel(logging.WARNING)
    logging.getLogger('redis').setLevel(logging.WARNING)
    logging.getLogger('asyncio').setLevel(logging.INFO if effective_log_level <= logging.DEBUG else logging.WARNING)
    logging.getLogger('aiohttp').setLevel(logging.WARNING)
    
    script_logger.info(f"Application starting. PID:{os.getpid()}. Log Level:{effective_log_level_str}")
    if effective_log_level <= logging.DEBUG: script_logger.debug(f"Initial CLI arguments: {vars(args)}")

    config: Optional[CrawlerConfig] = None; crawler_instance: Optional[WebCrawler] = None
    api_server_instance: Optional[APIServer] = None; exit_code = 0
    try:
        # Load YAML config
        yaml_config = {}
        config_path = args.config
        if config_path and os.path.exists(config_path):
            script_logger.info(f"Loading YAML configuration from: {config_path}")
            try:
                with open(config_path, 'r') as f:
                    yaml_config = yaml.safe_load(f) or {}
                    if not isinstance(yaml_config, dict):
                        raise ValueError("YAML config must be a dictionary")
                    yaml_config = yaml_config.get('crawler', yaml_config)  # Support 'crawler' key or flat config
            except Exception as e:
                script_logger.error(f"Failed to load YAML config from {config_path}: {e}", exc_info=True)
                raise FileNotFoundError(f"Invalid YAML config: {e}")
        else:
            script_logger.info(f"No YAML config file found at {config_path}. Using defaults and CLI args.")

        # Create a dictionary from CLI args, filtering out None values
        cli_config_overrides = {k: v for k, v in vars(args).items() if v is not None}
        
        # Map CLI args to CrawlerConfig fields
        if args.enable_local_save is not None: cli_config_overrides['enable_local_save'] = args.enable_local_save
        if args.enable_kafka_output is not None: cli_config_overrides['enable_kafka_output'] = args.enable_kafka_output
        if args.respect_robots_txt is not None: cli_config_overrides['respect_robots_txt'] = args.respect_robots_txt
        if args.allow_redirects is not None: cli_config_overrides['allow_redirects'] = args.allow_redirects

        config = CrawlerConfig.from_file(config_path, cli_args=cli_config_overrides)
        config.validate()
        script_logger.info("Configuration loaded and validated successfully.")
        script_logger.info(f"Effective Run Config - Workers:{config.workers}, MaxDepth:{config.max_depth}, MaxPages:{config.max_pages if config.max_pages > 0 else 'Unlimited'}")
        script_logger.info(f"Output - Kafka: {config.enable_kafka_output}, LocalSave: {config.enable_local_save}")
        if config.enable_local_save: script_logger.info(f"Local Output Dir: {config.local_output_dir}")
        if config.enable_kafka_output: script_logger.info(f"Kafka Topic: {config.output_topic}")
        script_logger.info(f"API Server - Host: {config.api_host}, Port: {config.api_port}")
        script_logger.info(f"Crawl Settings - AllowRedirects: {config.allow_redirects}, RespectRobotsTxt: {config.respect_robots_txt}")
        if config.allowed_domains: script_logger.info(f"Allowed Domains: {config.allowed_domains}")
        if config.seed_urls or config.seed_urls_file: script_logger.info(f"Seed URLs: {config.seed_urls}, File: {config.seed_urls_file}")

        crawler_instance = WebCrawler(config)
        api_server_instance = APIServer(crawler_instance, host=config.api_host, port=config.api_port)
        
        script_logger.info("Initializing crawler instance...")
        await crawler_instance.initialize()
        script_logger.info("Crawler initialization complete.")
        
        script_logger.info("Starting API server...")
        await api_server_instance.start()
        
        script_logger.info("Starting crawl run...")
        await crawler_instance.run()
        script_logger.info("Crawl run finished or was interrupted.")

    except KeyboardInterrupt:
        script_logger.info("Process interrupted by user (KeyboardInterrupt in main).")
        exit_code = 130
    except CrawlError as e:
        script_logger.error(f"Critical crawl error: {e}", exc_info=True)
        exit_code = 1
    except FileNotFoundError as e:
        script_logger.error(f"Configuration file error: {e}", exc_info=True)
        exit_code = 2
    except Exception as e:
        script_logger.error(f"An unexpected fatal error occurred in main: {e}", exc_info=True)
        exit_code = 1
    finally:
        script_logger.info("Initiating graceful shutdown process...")
        if api_server_instance and api_server_instance.site:
            script_logger.info("Stopping API server...")
            await api_server_instance.stop()
        
        if crawler_instance:
            script_logger.info("Ensuring crawler instance is stopped and resources are closed...")
            if crawler_instance.running : crawler_instance.running = False
            await crawler_instance.close()
        
        await asyncio.sleep(1.0)
        script_logger.info(f"Shutdown complete. Exiting with code {exit_code}.")
    
    return exit_code


if __name__ == "__main__":
    bootstrap_logger = logging.getLogger('web_crawler.bootstrap')
    try:
        exit_status = asyncio.run(main())
        sys.exit(exit_status)
    except KeyboardInterrupt:
        bootstrap_logger.warning("asyncio.run() interrupted by KeyboardInterrupt.")
        sys.exit(130)
    except Exception as e_bootstrap:
        bootstrap_logger.critical(f"Unhandled exception at bootstrap level: {e_bootstrap}", exc_info=True)
        sys.exit(1)
