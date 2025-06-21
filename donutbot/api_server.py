#!/usr/bin/env python3
"""
Comprehensive API Server for the Web Crawler
Handles all functionality through REST endpoints
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

from aiohttp import web
from aiohttp.web import Request, Response, json_response

from .crawler_config import CrawlerConfig
from .exceptions import CrawlError, ConfigurationError
from .url_utils import normalize_url
from .web_crawler import WebCrawler


class CrawlerAPIServer:
    """Comprehensive API server for web crawler functionality."""
    
    def __init__(self, host: str = "0.0.0.0", port: int = 8089):
        self.host = host
        self.port = port
        self.crawler: Optional[WebCrawler] = None
        self.config: Optional[CrawlerConfig] = None
        self.logger = logging.getLogger('crawler.api_server')
        
        # Setup application with CORS middleware
        self.app = web.Application(middlewares=[self.cors_middleware])
        self.runner = None
        self.site = None
        
        self._setup_routes()
    
    @web.middleware
    async def cors_middleware(self, request: Request, handler):
        """CORS middleware for cross-origin requests."""
        response = await handler(request)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    def _setup_routes(self):
        """Setup all API routes."""
        
        # Crawler Management
        self.app.router.add_post('/api/v1/crawler/start', self.start_crawler)
        self.app.router.add_post('/api/v1/crawler/stop', self.stop_crawler)
        self.app.router.add_get('/api/v1/crawler/status', self.get_crawler_status)
        self.app.router.add_post('/api/v1/crawler/reset', self.reset_crawler)
        
        # URL Management
        self.app.router.add_post('/api/v1/urls/add', self.add_urls)
        self.app.router.add_get('/api/v1/urls/queue', self.get_queue_status)
        self.app.router.add_delete('/api/v1/urls/clear', self.clear_urls)
        
        # Configuration Management
        self.app.router.add_get('/api/v1/config', self.get_config)
        self.app.router.add_put('/api/v1/config', self.update_config)
        self.app.router.add_get('/api/v1/config/domains', self.get_allowed_domains)
        self.app.router.add_put('/api/v1/config/domains', self.update_allowed_domains)
        
        # Metrics and Statistics
        self.app.router.add_get('/api/v1/metrics', self.get_metrics)
        self.app.router.add_get('/api/v1/stats', self.get_stats)
        self.app.router.add_get('/api/v1/health', self.health_check)
        
        # Results and Data
        self.app.router.add_get('/api/v1/results', self.get_results)
        self.app.router.add_get('/api/v1/results/{url_hash}', self.get_result_by_url)
        self.app.router.add_delete('/api/v1/results', self.clear_results)
        
        # OPTIONS routes for CORS preflight
        for route in self.app.router.routes():
            if hasattr(route, 'resource'):
                path = route.resource.canonical
                if path:
                    self.app.router.add_route("OPTIONS", path, self.handle_options)
    
    async def handle_options(self, request: Request) -> Response:
        """Handle CORS preflight requests."""
        return web.Response(
            status=200,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        )
    
    async def start_crawler(self, request: Request) -> Response:
        """Start the crawler with optional configuration."""
        try:
            data = await request.json() if request.can_read_body else {}
            
            # Create or update configuration
            if not self.config:
                self.config = CrawlerConfig()
            
            # Update config with provided data
            for key, value in data.get('config', {}).items():
                if hasattr(self.config, key):
                    setattr(self.config, key, value)
            
            self.config.validate()
            
            # Create crawler if not exists
            if not self.crawler:
                self.crawler = WebCrawler(self.config)
                await self.crawler.initialize()
            
            # Start crawling in background
            if not self.crawler.running:
                asyncio.create_task(self.crawler.run())
            
            return json_response({
                'message': 'Crawler started successfully',
                'config': {
                    'workers': self.config.workers,
                    'max_depth': self.config.max_depth,
                    'max_pages': self.config.max_pages,
                    'allowed_domains': self.config.allowed_domains
                }
            }, status=200)
            
        except ConfigurationError as e:
            return json_response({'error': f'Configuration error: {str(e)}'}, status=400)
        except Exception as e:
            self.logger.error(f"Error starting crawler: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def stop_crawler(self, request: Request) -> Response:
        """Stop the crawler."""
        try:
            if self.crawler and self.crawler.running:
                self.crawler.running = False
                await self.crawler.close()
                return json_response({'message': 'Crawler stopped successfully'}, status=200)
            else:
                return json_response({'message': 'Crawler was not running'}, status=200)
                
        except Exception as e:
            self.logger.error(f"Error stopping crawler: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def get_crawler_status(self, request: Request) -> Response:
        """Get comprehensive crawler status."""
        try:
            if not self.crawler:
                return json_response({'error': 'Crawler not initialized'}, status=503)
            
            metrics = self.crawler.metrics
            frontier = self.crawler.url_frontier
            config = self.crawler.config
            
            uptime = time.time() - self.crawler.start_time if self.crawler.start_time else 0
            rate = metrics.pages_crawled / uptime if uptime > 0 else 0
            remaining = "N/A"
            if config.max_pages > 0:
                remaining = max(0, config.max_pages - metrics.pages_crawled)
            
            status_data = {
                'crawler_running': self.crawler.running,
                'uptime_seconds': round(uptime, 2),
                'pages_crawled_total': metrics.pages_crawled,
                'max_pages_configured': config.max_pages if config.max_pages > 0 else "Unlimited",
                'pages_remaining_in_limit': remaining,
                'avg_pages_per_second': round(rate, 2),
                'frontier_queue_size': await frontier.size() if frontier else -1,
                'urls_in_processing': await frontier.get_processing_count() if frontier else -1,
                'urls_completed_redis': await frontier.get_completed_count() if frontier else -1,
                'urls_seen_redis': await frontier.get_seen_count() if frontier else -1,
                'bloom_filter_items': self.crawler.bloom_filter.count if self.crawler.bloom_filter else -1,
                'robots_denied_count': metrics.robots_denied,
                'total_errors_count': metrics.errors,
                'active_workers_configured': config.workers,
                'current_time_utc': datetime.now(timezone.utc).isoformat(),
                'allowed_domains': config.allowed_domains or []
            }
            
            return json_response(status_data, status=200)
            
        except Exception as e:
            self.logger.error(f"Error getting crawler status: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def reset_crawler(self, request: Request) -> Response:
        """Reset crawler state and data."""
        try:
            if not self.crawler:
                return json_response({'error': 'Crawler not initialized'}, status=503)
            
            data = await request.json() if request.can_read_body else {}
            
            report = await self.crawler.reset_crawl_status(
                clear_redis_completed=data.get('redis_completed', True),
                clear_redis_seen=data.get('redis_seen', True),
                clear_redis_processing=data.get('redis_processing', False),
                clear_redis_queue=data.get('redis_queue', False),
                clear_bloom_filter=data.get('bloom_filter', True)
            )
            
            return json_response({
                'message': 'Crawler reset successfully',
                'details': report
            }, status=200)
            
        except Exception as e:
            self.logger.error(f"Error resetting crawler: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def add_urls(self, request: Request) -> Response:
        """Add URLs to the crawler queue."""
        try:
            if not self.crawler or not self.crawler.running:
                return json_response({'error': 'Crawler is not running'}, status=503)
            
            data = await request.json()
            urls_to_add = data.get('urls', [])
            priority = data.get('priority', 0.5)
            depth = data.get('depth', 0)
            
            if not isinstance(urls_to_add, list):
                return json_response({'error': 'URLs must be a list'}, status=400)
            
            added_count, skipped_count, invalid_count = 0, 0, 0
            normalized_urls = []
            
            for url_str in urls_to_add:
                if not isinstance(url_str, str) or not url_str.strip():
                    invalid_count += 1
                    continue
                
                norm_url = normalize_url(url_str.strip())
                parsed_url = urlparse(norm_url)
                
                if not parsed_url.scheme or not parsed_url.netloc:
                    invalid_count += 1
                    continue
                
                normalized_urls.append(norm_url)
            
            for url in normalized_urls:
                try:
                    was_added = await self.crawler.url_frontier.add_url(url, priority, depth)
                    if was_added:
                        added_count += 1
                    else:
                        skipped_count += 1
                except Exception as e:
                    self.logger.error(f"Error adding URL {url}: {e}")
                    skipped_count += 1
            
            return json_response({
                'message': f'{added_count} URLs added, {skipped_count} skipped, {invalid_count} invalid',
                'added_count': added_count,
                'skipped_count': skipped_count,
                'invalid_count': invalid_count
            }, status=200)
            
        except json.JSONDecodeError:
            return json_response({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            self.logger.error(f"Error adding URLs: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def get_queue_status(self, request: Request) -> Response:
        """Get URL queue status."""
        try:
            if not self.crawler:
                return json_response({'error': 'Crawler not initialized'}, status=503)
            
            frontier = self.crawler.url_frontier
            stats = await frontier.get_stats()
            
            return json_response(stats, status=200)
            
        except Exception as e:
            self.logger.error(f"Error getting queue status: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def clear_urls(self, request: Request) -> Response:
        """Clear URL queue and data."""
        try:
            if not self.crawler:
                return json_response({'error': 'Crawler not initialized'}, status=503)
            
            data = await request.json() if request.can_read_body else {}
            
            await self.crawler.url_frontier.clear_specific_data(
                clear_completed=data.get('completed', True),
                clear_seen=data.get('seen', True),
                clear_processing=data.get('processing', False),
                clear_queue=data.get('queue', False)
            )
            
            return json_response({'message': 'URLs cleared successfully'}, status=200)
            
        except Exception as e:
            self.logger.error(f"Error clearing URLs: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def get_config(self, request: Request) -> Response:
        """Get current configuration."""
        try:
            if not self.config:
                return json_response({'error': 'Configuration not initialized'}, status=503)
            
            config_dict = {
                'workers': self.config.workers,
                'max_depth': self.config.max_depth,
                'max_pages': self.config.max_pages,
                'default_delay': self.config.default_delay,
                'allowed_domains': self.config.allowed_domains,
                'enable_kafka_output': self.config.enable_kafka_output,
                'enable_local_save': self.config.enable_local_save,
                'respect_robots_txt': self.config.respect_robots_txt,
                'allow_redirects': self.config.allow_redirects,
                'redis_host': self.config.redis_host,
                'redis_port': self.config.redis_port,
                'kafka_brokers': self.config.kafka_brokers,
                'output_topic': self.config.output_topic
            }
            
            return json_response(config_dict, status=200)
            
        except Exception as e:
            self.logger.error(f"Error getting config: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def update_config(self, request: Request) -> Response:
        """Update configuration."""
        try:
            if not self.config:
                return json_response({'error': 'Configuration not initialized'}, status=503)
            
            data = await request.json()
            
            # Update config with provided data
            for key, value in data.items():
                if hasattr(self.config, key):
                    setattr(self.config, key, value)
            
            self.config.validate()
            
            return json_response({
                'message': 'Configuration updated successfully',
                'config': await self.get_config(request)
            }, status=200)
            
        except ConfigurationError as e:
            return json_response({'error': f'Configuration error: {str(e)}'}, status=400)
        except json.JSONDecodeError:
            return json_response({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            self.logger.error(f"Error updating config: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def get_allowed_domains(self, request: Request) -> Response:
        """Get allowed domains."""
        try:
            if not self.config:
                return json_response({'error': 'Configuration not initialized'}, status=503)
            
            return json_response({
                'allowed_domains': self.config.allowed_domains or []
            }, status=200)
            
        except Exception as e:
            self.logger.error(f"Error getting allowed domains: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def update_allowed_domains(self, request: Request) -> Response:
        """Update allowed domains."""
        try:
            if not self.config:
                return json_response({'error': 'Configuration not initialized'}, status=503)
            
            data = await request.json()
            action = data.get('action')
            domains = data.get('domains', [])
            
            if not isinstance(domains, list):
                return json_response({'error': 'Domains must be a list'}, status=400)
            
            if action not in ['add', 'remove', 'replace']:
                return json_response({'error': 'Action must be add, remove, or replace'}, status=400)
            
            if self.config.allowed_domains is None:
                self.config.allowed_domains = []
            
            current_domains = set(self.config.allowed_domains)
            new_domains = set(d.lower().strip() for d in domains if d.strip())
            
            if action == 'add':
                current_domains.update(new_domains)
            elif action == 'remove':
                current_domains.difference_update(new_domains)
            elif action == 'replace':
                current_domains = new_domains
            
            self.config.allowed_domains = sorted(list(current_domains))
            
            return json_response({
                'message': f'Domains {action}ed successfully',
                'allowed_domains': self.config.allowed_domains
            }, status=200)
            
        except json.JSONDecodeError:
            return json_response({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            self.logger.error(f"Error updating allowed domains: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def get_metrics(self, request: Request) -> Response:
        """Get crawler metrics."""
        try:
            if not self.crawler:
                return json_response({'error': 'Crawler not initialized'}, status=503)
            
            metrics = self.crawler.metrics
            stats = metrics.get_stats()
            
            return json_response(stats, status=200)
            
        except Exception as e:
            self.logger.error(f"Error getting metrics: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def get_stats(self, request: Request) -> Response:
        """Get comprehensive statistics."""
        try:
            if not self.crawler:
                return json_response({'error': 'Crawler not initialized'}, status=503)
            
            stats = {
                'crawler': self.crawler.metrics.get_stats(),
                'frontier': await self.crawler.url_frontier.get_stats(),
                'rate_limiter': self.crawler.rate_limiter.get_stats(),
                'bloom_filter': self.crawler.bloom_filter.get_stats()
            }
            
            return json_response(stats, status=200)
            
        except Exception as e:
            self.logger.error(f"Error getting stats: {e}", exc_info=True)
            return json_response({'error': f'Internal error: {str(e)}'}, status=500)
    
    async def health_check(self, request: Request) -> Response:
        """Health check endpoint."""
        try:
            if not self.crawler:
                return json_response({'status': 'unhealthy', 'reason': 'Crawler not initialized'}, status=503)
            
            healthy = (
                self.crawler.running and
                self.crawler.session and
                not self.crawler.session.closed
            )
            
            if healthy:
                return json_response({'status': 'healthy'}, status=200)
            else:
                return json_response({'status': 'unhealthy', 'reason': 'Crawler not running'}, status=503)
                
        except Exception as e:
            return json_response({'status': 'error', 'reason': str(e)}, status=500)
    
    async def get_results(self, request: Request) -> Response:
        """Get crawled results (placeholder for future implementation)."""
        return json_response({
            'message': 'Results endpoint - to be implemented',
            'note': 'This would return crawled documents and data'
        }, status=501)
    
    async def get_result_by_url(self, request: Request) -> Response:
        """Get result for specific URL (placeholder)."""
        url_hash = request.match_info['url_hash']
        return json_response({
            'message': 'Result by URL endpoint - to be implemented',
            'url_hash': url_hash
        }, status=501)
    
    async def clear_results(self, request: Request) -> Response:
        """Clear results (placeholder)."""
        return json_response({
            'message': 'Clear results endpoint - to be implemented'
        }, status=501)
    
    async def start(self):
        """Start the API server."""
        try:
            self.runner = web.AppRunner(self.app)
            await self.runner.setup()
            self.site = web.TCPSite(self.runner, self.host, self.port)
            await self.site.start()
            self.logger.info(f"API server started on {self.host}:{self.port}")
        except Exception as e:
            self.logger.error(f"Failed to start API server: {e}", exc_info=True)
            raise
    
    async def stop(self):
        """Stop the API server."""
        try:
            if self.site:
                await self.site.stop()
            if self.runner:
                await self.runner.cleanup()
            self.logger.info("API server stopped")
        except Exception as e:
            self.logger.error(f"Error stopping API server: {e}", exc_info=True)
            raise 