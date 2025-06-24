"""
Configuration management for the donut-bot backend.
Uses Pydantic settings for type-safe configuration.
"""

from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "Donut Bot API"
    app_version: str = "1.0.0"
    debug: bool = Field(default=True)
    
    # Server
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8089)
    
    # Database
    mongo_uri: str = Field(
        default="mongodb://admin:password123@localhost:27017/webcrawler?authSource=admin"
    )
    database_name: str = Field(default="webcrawler")
    
    # Redis
    redis_host: str = Field(default="localhost")
    redis_port: int = Field(default=6379)
    redis_db: int = Field(default=0)
    
    # Kafka
    kafka_brokers: str = Field(default="localhost:9092")
    kafka_topic: str = Field(default="raw-documents")
    enable_kafka_output: bool = Field(default=False)
    
    # Crawler Configuration
    default_workers: int = Field(default=3)
    default_max_depth: int = Field(default=3)
    default_max_pages: int = Field(default=4000)
    default_delay: float = Field(default=2.0)
    default_allowed_domains: List[str] = Field(
        default=["northeastern.edu", "nyu.edu", "stanford.edu"]
    )
    
    # Security
    secret_key: str = Field(default="your-secret-key-here")
    access_token_expire_minutes: int = Field(default=30)
    
    # CORS
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"]
    )
    
    # Logging
    log_level: str = Field(default="DEBUG")
    
    # File Storage
    enable_local_save: bool = Field(default=True)
    local_output_dir: str = Field(default="./crawler_output")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings() 