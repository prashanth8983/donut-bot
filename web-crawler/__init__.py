"""Web Crawler Module"""

from .web_crawler import WebCrawler
from functions.crawler_config import CrawlerConfig
from functions.url_frontier import URLFrontier
from functions.robots_checker import RobotsChecker
from functions.content_extractor import ContentExtractor
from functions.rate_limiter import RateLimiter
from functions.bloom_filter import BloomFilter
from functions.metrics import CrawlerMetrics
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