"""
Configuration management for the donut-bot backend.
Uses Pydantic settings for type-safe configuration.
"""

from typing import List, Optional
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "Donut Bot API"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, env="DEBUG")
    
    # Server
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8089, env="PORT")
    
    # Database
    mongo_uri: str = Field(
        default="mongodb://admin:password123@mongodb:27017/webcrawler?authSource=admin",
        env="MONGO_URI"
    )
    database_name: str = Field(default="webcrawler", env="DATABASE_NAME")
    
    # Redis
    redis_host: str = Field(default="redis", env="REDIS_HOST")
    redis_port: int = Field(default=6379, env="REDIS_PORT")
    redis_db: int = Field(default=0, env="REDIS_DB")
    
    # Kafka
    kafka_brokers: str = Field(default="kafka:9092", env="KAFKA_BROKERS")
    kafka_topic: str = Field(default="raw-documents", env="KAFKA_TOPIC")
    
    # Crawler Configuration
    default_workers: int = Field(default=3, env="DEFAULT_WORKERS")
    default_max_depth: int = Field(default=3, env="DEFAULT_MAX_DEPTH")
    default_max_pages: int = Field(default=4000, env="DEFAULT_MAX_PAGES")
    default_delay: float = Field(default=2.0, env="DEFAULT_DELAY")
    default_allowed_domains: List[str] = Field(
        default=["northeastern.edu", "nyu.edu", "stanford.edu"],
        env="DEFAULT_ALLOWED_DOMAINS"
    )
    
    # Security
    secret_key: str = Field(default="your-secret-key-here", env="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # CORS
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"],
        env="CORS_ORIGINS"
    )
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings() 