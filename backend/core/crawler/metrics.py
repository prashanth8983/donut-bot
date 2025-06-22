"""
Metrics tracking for the crawler.
Tracks performance and statistics during crawling.
"""

import time
from typing import Dict, Any
from ..logger import get_logger

logger = get_logger("crawler.metrics")


class CrawlerMetrics:
    """Tracks crawler performance metrics."""
    
    def __init__(self):
        self.pages_crawled = 0
        self.errors = 0
        self.robots_denied = 0
        self.start_time = time.time()
        self.last_report_time = self.start_time
        
    def increment_pages_crawled(self):
        """Increment the pages crawled counter."""
        self.pages_crawled += 1
        
    def increment_errors(self):
        """Increment the errors counter."""
        self.errors += 1
        
    def increment_robots_denied(self):
        """Increment the robots denied counter."""
        self.robots_denied += 1
        
    def get_uptime(self) -> float:
        """Get the uptime in seconds."""
        return time.time() - self.start_time
        
    def get_crawl_rate(self) -> float:
        """Get the crawl rate (pages per second)."""
        uptime = self.get_uptime()
        return self.pages_crawled / uptime if uptime > 0 else 0
        
    def get_stats(self) -> Dict[str, Any]:
        """Get all current metrics."""
        uptime = self.get_uptime()
        return {
            'pages_crawled': self.pages_crawled,
            'errors': self.errors,
            'robots_denied': self.robots_denied,
            'uptime_seconds': round(uptime, 2),
            'crawl_rate': round(self.get_crawl_rate(), 2),
            'success_rate': round((self.pages_crawled / (self.pages_crawled + self.errors)) * 100, 2) if (self.pages_crawled + self.errors) > 0 else 0
        }
        
    def reset(self):
        """Reset all metrics."""
        self.pages_crawled = 0
        self.errors = 0
        self.robots_denied = 0
        self.start_time = time.time()
        self.last_report_time = self.start_time 