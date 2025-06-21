"""Web Crawler Module"""

from .web_crawler import WebCrawler
from donutbot.crawler_config import CrawlerConfig
from donutbot.url_frontier import URLFrontier
from donutbot.robots_checker import RobotsChecker
from donutbot.content_extractor import ContentExtractor
from donutbot.rate_limiter import RateLimiter
from donutbot.bloom_filter import BloomFilter
from donutbot.metrics import CrawlerMetrics
from functions.exceptions import (
    CrawlError,
    RobotsError,
    RateLimitError,
    FetchError,
    ConfigurationError,
    QueueError
)

__version__ = "1.0.0"
__all__ = [
    'WebCrawler',
    'CrawlerConfig',
    'URLFrontier',
    'RobotsChecker',
    'ContentExtractor',
    'RateLimiter',
    'BloomFilter',
    'CrawlerMetrics',
    'CrawlError',
    'RobotsError',
    'RateLimitError',
    'FetchError',
    'ConfigurationError',
    'QueueError'
]