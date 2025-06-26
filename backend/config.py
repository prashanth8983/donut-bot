"""
Configuration management for the donut-bot backend.
Uses Pydantic settings for type-safe configuration.
"""

import json
import os
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel, Field, ValidationError
from pydantic_settings import BaseSettings

# Check if we're running locally (config_local.json exists)
CONFIG_PATH = Path(__file__).parent / "config.json"
LOCAL_CONFIG_PATH = Path(__file__).parent / "config_local.json"

# Use local config if it exists, otherwise use the default
if LOCAL_CONFIG_PATH.exists():
    CONFIG_PATH = LOCAL_CONFIG_PATH

class Settings(BaseSettings):
    """Application settings loaded from environment variables with JSON fallback."""
    
    # Application
    app_name: str = "Donut Bot API"
    app_version: str = "1.0.0"
    debug: bool = True
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8089
    
    # Database
    mongo_uri: str = "mongodb://admin:password123@mongodb:27017/webcrawler?authSource=admin"
    database_name: str = "webcrawler"
    
    # Redis
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_db: int = 0
    
    # Kafka
    kafka_brokers: str = "kafka:29092"
    kafka_topic: str = "raw-documents"
    enable_kafka_output: bool = False
    
    # Crawler Configuration
    default_workers: int = 3
    default_max_depth: int = 3
    default_max_pages: int = 4000
    default_delay: float = 2.0
    default_allowed_domains: List[str] = ["northeastern.edu", "nyu.edu", "stanford.edu", "mit.edu"]
    
    # Security
    secret_key: str = "your-secret-key-here"
    access_token_expire_minutes: int = 30
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8080", "http://frontend:80"]
    
    # Logging
    log_level: str = "DEBUG"
    
    # File Storage
    enable_local_save: bool = True
    local_output_dir: str = "/app/crawler_output"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
    
    @classmethod
    def load(cls, path: Path = CONFIG_PATH):
        """Load settings from JSON file with environment variable override."""
        # Load from JSON file
        if path.exists():
            with open(path, "r") as f:
                data = json.load(f)
        else:
            data = {}
        
        # Create settings instance with JSON data as defaults
        try:
            return cls(**data)
        except ValidationError as e:
            raise RuntimeError(f"Invalid config: {e}")


# Global settings instance
settings = Settings.load() 