import os
from dataclasses import dataclass, field
from typing import List, Optional, Dict

@dataclass
class CrawlerConfig:
    kafka_brokers: str = "kafka:9092"
    output_topic: str = "raw-documents"
    enable_kafka_output: bool = False
    enable_local_save: bool = True
    local_output_dir: str = "/app/crawler_output"
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
    api_port: int = 8089
    api_host: str = "0.0.0.0"
    default_delay: float = 2.0
    rate_limits: Dict[str, float] = field(default_factory=dict)
    allowed_domains: List[str] = field(default_factory=lambda: [
        "northeastern.edu", "nyu.edu", "stanford.edu",
        "www.northeastern.edu", "www.nyu.edu", "www.stanford.edu"
    ])
    seed_urls: List[str] = field(default_factory=lambda: [
        "https://www.northeastern.edu/academics/",
        "https://www.nyu.edu/academics/",
        "https://www.stanford.edu/academics/"
    ])
    seed_urls_file: Optional[str] = "/app/seed_urls.txt"
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

    @staticmethod
    def _str_to_bool(s):
        return s.lower() in ['true', '1', 'yes', 'on'] if s else False

    @classmethod
    def from_file(cls, filepath=None, cli_args=None):
        config = cls()
        if filepath and os.path.exists(filepath):
            try:
                with open(filepath, 'r') as f:
                    import yaml
                    data = yaml.safe_load(f) or {}
                    yaml_config = data.get('crawler', data) if isinstance(data, dict) else {}
                    for f in cls.__dataclass_fields__.values():
                        if (val := yaml_config.get(f.name)) is not None:
                            try:
                                if f.type == bool and isinstance(val, str):
                                    val = cls._str_to_bool(val)
                                elif f.type == int and isinstance(val, str):
                                    val = int(val)
                                elif f.type == float and isinstance(val, str):
                                    val = float(val)
                                elif f.type == List[str] and isinstance(val, str):
                                    val = [s.strip() for s in val.split(',') if s.strip()]
                                elif f.type in (Dict[str, str], Dict[str, float]) and isinstance(val, str):
                                    import json
                                    val = {k: float(v) if f.type == Dict[str, float] else v for k, v in json.loads(val).items()}
                                setattr(config, f.name, val)
                            except:
                                pass
            except:
                raise FileNotFoundError("Invalid YAML")

        if env_urls := os.getenv('SEED_URLS'):
            config.seed_urls = [url.strip() for url in env_urls.split(',') if url.strip()]
        
        for f in cls.__dataclass_fields__.values():
            if (env_val := os.getenv(f.name.upper())) is not None and f.name != "seed_urls":
                try:
                    t = f.type.__args__[0] if getattr(f.type, '__origin__', None) == Optional else f.type
                    if t == bool:
                        val = cls._str_to_bool(env_val)
                    elif t == int:
                        val = int(env_val)
                    elif t == float:
                        val = float(env_val)
                    elif t == List[str]:
                        val = [s.strip() for s in env_val.split(',') if s.strip()]
                    elif t in (Dict[str, str], Dict[str, float]):
                        import json
                        val = {k: float(v) if t == Dict[str, float] else v for k, v in json.loads(env_val).items()}
                    else:
                        val = env_val
                    setattr(config, f.name, val)
                except:
                    pass

        if cli_args:
            if (urls := cli_args.get('seed_urls')) is not None:
                config.seed_urls = urls
            for k, v in cli_args.items():
                if k == "seed_urls" and cli_args.get('seed_urls') is not None:
                    continue
                if hasattr(config, k) and v is not None:
                    try:
                        t = cls.__dataclass_fields__[k].type
                        t = t.__args__[0] if getattr(t, '__origin__', None) == Optional else t
                        val = v
                        if isinstance(v, str):
                            if t == bool:
                                val = cls._str_to_bool(v)
                            elif t == int:
                                val = int(v)
                            elif t == float:
                                val = float(v)
                        setattr(config, k, val)
                    except:
                        pass
        
        if not isinstance(config.seed_urls, list):
            config.seed_urls = []
        return config

    def validate(self):
        if self.enable_kafka_output and self.enable_local_save:
            raise ValueError("Dual output enabled")
        if self.enable_kafka_output and not self.kafka_brokers:
            raise ValueError("No Kafka brokers")
        if self.enable_local_save and not self.local_output_dir:
            raise ValueError("No output dir")
        if self.workers < 1:
            raise ValueError("Invalid workers")
        if self.max_depth < 0:
            raise ValueError("Invalid max depth")
        if self.max_pages < 0:
            raise ValueError("Invalid max pages")
        if self.default_delay < 0:
            raise ValueError("Invalid delay")
        for d, v in self.rate_limits.items():
            if v < 0:
                raise ValueError(f"Invalid rate: {d}")
        if not isinstance(self.bloom_capacity, int) or self.bloom_capacity <= 0:
            raise ValueError("Invalid bloom capacity")
        if not isinstance(self.bloom_error_rate, float) or not (0 < self.bloom_error_rate < 1):
            raise ValueError("Invalid bloom rate")