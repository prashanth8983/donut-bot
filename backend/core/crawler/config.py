"""
Crawler configuration for the backend.
Based on the web-crawler implementation with FastAPI integration.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict
from pydantic import BaseModel


class CrawlerConfigModel(BaseModel):
    """Pydantic model for crawler configuration."""
    
    # Kafka settings
    kafka_brokers: str = "kafka:9092"
    output_topic: str = "raw-documents"
    enable_kafka_output: bool = False
    enable_local_save: bool = True
    local_output_dir: str = "./crawler_output"
    
    # Redis settings
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: Optional[str] = None
    
    # Crawler settings
    workers: int = 3
    max_depth: int = 3
    max_pages: int = 4000
    request_timeout: int = 30
    max_connections: int = 100
    allow_redirects: bool = True
    default_delay: float = 2.0
    
    # Rate limiting
    rate_limits: Dict[str, float] = field(default_factory=dict)
    
    # Domain and URL settings
    allowed_domains: List[str] = field(default_factory=list)
    seed_urls: List[str] = field(default_factory=list)
    seed_urls_file: Optional[str] = None
    
    # Content filtering
    excluded_extensions: List[str] = field(default_factory=lambda: [
        '.pdf', '.zip', '.rar', '.gz', '.tar', '.mp3', '.mp4', '.avi', '.mov',
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.css', '.js',
        '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.dmg', '.exe', '.msi', '.svg'
    ])
    priority_patterns: List[str] = field(default_factory=lambda: [
        'article', 'post', 'blog', 'news', 'story', 'content', 'product'
    ])
    allowed_content_types: List[str] = field(default_factory=lambda: [
        'text/html', 'application/xhtml+xml', 'application/xml'
    ])
    max_content_size: int = 10485760
    
    # Robots and security
    respect_robots_txt: bool = True
    robots_cache_time: int = 3600
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ssl_verification_enabled: bool = True
    custom_ca_bundle: Optional[str] = None
    
    # Headers
    additional_headers: Dict[str, str] = field(default_factory=lambda: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
    })
    
    # Metrics and monitoring
    metrics_enabled: bool = True
    metrics_interval: int = 60
    
    # Bloom filter settings
    bloom_capacity: int = 10_000_000
    bloom_error_rate: float = 0.001
    
    # Shutdown settings
    idle_shutdown_threshold: int = 3
    
    class Config:
        validate_assignment = True


@dataclass
class CrawlerConfig:
    """Dataclass for crawler configuration (legacy compatibility)."""
    
    kafka_brokers: str = "kafka:9092"
    output_topic: str = "raw-documents"
    enable_kafka_output: bool = False
    enable_local_save: bool = True
    local_output_dir: str = "./crawler_output"
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: Optional[str] = None
    workers: int = 3
    max_depth: int = 3
    max_pages: int = 4000
    request_timeout: int = 30
    max_connections: int = 100
    allow_redirects: bool = True
    default_delay: float = 2.0
    rate_limits: Dict[str, float] = field(default_factory=dict)
    allowed_domains: List[str] = field(default_factory=list)
    seed_urls: List[str] = field(default_factory=list)
    seed_urls_file: Optional[str] = None
    excluded_extensions: List[str] = field(default_factory=lambda: [
        '.pdf', '.zip', '.rar', '.gz', '.tar', '.mp3', '.mp4', '.avi', '.mov',
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.css', '.js',
        '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.dmg', '.exe', '.msi', '.svg'
    ])
    priority_patterns: List[str] = field(default_factory=lambda: [
        'article', 'post', 'blog', 'news', 'story', 'content', 'product'
    ])
    allowed_content_types: List[str] = field(default_factory=lambda: [
        'text/html', 'application/xhtml+xml', 'application/xml'
    ])
    max_content_size: int = 10485760
    respect_robots_txt: bool = True
    robots_cache_time: int = 3600
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ssl_verification_enabled: bool = True
    custom_ca_bundle: Optional[str] = None
    additional_headers: Dict[str, str] = field(default_factory=lambda: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
    })
    metrics_enabled: bool = True
    metrics_interval: int = 60
    bloom_capacity: int = 10_000_000
    bloom_error_rate: float = 0.001
    idle_shutdown_threshold: int = 3 