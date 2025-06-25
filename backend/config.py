"""
Configuration management for the donut-bot backend.
Uses Pydantic settings for type-safe configuration.
"""

import json
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel, Field, ValidationError

CONFIG_PATH = Path(__file__).parent / "config.json"

class Settings(BaseModel):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str
    app_version: str
    debug: bool
    
    # Server
    host: str
    port: int
    
    # Database
    mongo_uri: str
    database_name: str
    
    # Redis
    redis_host: str
    redis_port: int
    redis_db: int
    
    # Kafka
    kafka_brokers: str
    kafka_topic: str
    enable_kafka_output: bool
    
    # Crawler Configuration
    default_workers: int
    default_max_depth: int
    default_max_pages: int
    default_delay: float
    default_allowed_domains: List[str]
    
    # Security
    secret_key: str
    access_token_expire_minutes: int
    
    # CORS
    cors_origins: List[str]
    
    # Logging
    log_level: str
    
    # File Storage
    enable_local_save: bool
    local_output_dir: str
    
    @classmethod
    def load(cls, path: Path = CONFIG_PATH):
        with open(path, "r") as f:
            data = json.load(f)
        try:
            return cls(**data)
        except ValidationError as e:
            raise RuntimeError(f"Invalid config.json: {e}")


# Global settings instance
settings = Settings.load() 