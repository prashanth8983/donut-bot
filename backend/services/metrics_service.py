"""
Metrics service for monitoring and metrics operations.
Provides business logic for metrics and statistics.
"""

from typing import Dict, Any
from datetime import datetime, timezone
from ..core.logger import get_logger

logger = get_logger("metrics_service")


class MetricsService:
    """Service for managing metrics and statistics operations."""
    
    def __init__(self, crawler_service):
        self.crawler_service = crawler_service
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get crawler metrics."""
        if not self.crawler_service.crawler_engine:
            return {
                'pages_crawled': 0,
                'errors': 0,
                'robots_denied': 0,
                'uptime_seconds': 0,
                'crawl_rate': 0,
                'success_rate': 0,
                'error': 'Crawler not initialized'
            }
        
        try:
            engine = self.crawler_service.crawler_engine
            metrics = engine.metrics
            
            if metrics:
                return {
                    'pages_crawled': metrics.pages_crawled,
                    'errors': metrics.errors,
                    'robots_denied': metrics.robots_denied,
                    'uptime_seconds': metrics.get_uptime(),
                    'crawl_rate': metrics.get_crawl_rate(),
                    'success_rate': metrics.get_stats()['success_rate']
                }
            else:
                return {
                    'pages_crawled': engine.pages_crawled,
                    'errors': engine.errors,
                    'robots_denied': engine.robots_denied,
                    'uptime_seconds': engine.get_status().get('uptime_seconds', 0),
                    'crawl_rate': 0,
                    'success_rate': 0
                }
        except Exception as e:
            logger.error(f"Error getting metrics: {e}")
            return {
                'pages_crawled': 0,
                'errors': 0,
                'robots_denied': 0,
                'uptime_seconds': 0,
                'crawl_rate': 0,
                'success_rate': 0,
                'error': str(e)
            }
    
    async def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive statistics."""
        if not self.crawler_service.crawler_engine:
            return {
                'crawler_status': 'not_initialized',
                'metrics': {},
                'queue_stats': {},
                'system_stats': {},
                'error': 'Crawler not initialized'
            }
        
        try:
            engine = self.crawler_service.crawler_engine
            
            # Get basic metrics
            metrics = await self.get_metrics()
            
            # Get queue statistics
            queue_stats = {}
            if engine.url_frontier:
                queue_stats = {
                    'queue_size': await engine.url_frontier.size(),
                    'processing_count': await engine.url_frontier.get_processing_count(),
                    'completed_count': await engine.url_frontier.get_completed_count(),
                    'seen_count': await engine.url_frontier.get_seen_count()
                }
            
            # Get system statistics
            system_stats = {
                'crawler_running': engine.running,
                'workers_active': len(engine.workers) if engine.workers else 0,
                'bloom_filter_items': engine.bloom_filter.count if engine.bloom_filter else 0,
                'current_time': datetime.now(timezone.utc).isoformat()
            }
            
            # Get configuration summary
            config_summary = {}
            if self.crawler_service.config:
                config = self.crawler_service.config
                config_summary = {
                    'workers': config.workers,
                    'max_depth': config.max_depth,
                    'max_pages': config.max_pages,
                    'default_delay': config.default_delay,
                    'allowed_domains_count': len(config.allowed_domains) if config.allowed_domains else 0
                }
            
            return {
                'crawler_status': 'running' if engine.running else 'stopped',
                'metrics': metrics,
                'queue_stats': queue_stats,
                'system_stats': system_stats,
                'config_summary': config_summary
            }
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {
                'crawler_status': 'error',
                'metrics': {},
                'queue_stats': {},
                'system_stats': {},
                'error': str(e)
            }


# Dependency injection
async def get_metrics_service():
    """Get metrics service instance."""
    from .crawler_service import crawler_service
    return MetricsService(crawler_service) 