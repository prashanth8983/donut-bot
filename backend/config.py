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

class Settings(BaseSettings):
    """Application settings loaded from environment variables with JSON fallback."""
    
    # Application
    app_name: str = Field("Donut Bot API", env="APP_NAME")
    app_version: str = Field("1.0.0", env="APP_VERSION")
    debug: bool = Field(True, env="DEBUG")
    
    # Server
    host: str = Field("0.0.0.0", env="HOST")
    port: int = Field(8089, env="PORT")
    
    # Database
    mongo_uri: str = Field("mongodb://localhost:27017/donut_bot", env="MONGO_URI")
    database_name: str = Field("donut_bot", env="DATABASE_NAME")
    
    # Redis
    redis_host: str = Field("localhost", env="REDIS_HOST")
    redis_port: int = Field(6379, env="REDIS_PORT")
    redis_db: int = Field(0, env="REDIS_DB")
    
    # Kafka
    kafka_brokers: str = Field("kafka:29092", env="KAFKA_BROKERS")
    kafka_topic: str = Field("raw-documents", env="KAFKA_TOPIC")
    enable_kafka_output: bool = Field(False, env="ENABLE_KAFKA_OUTPUT")
    
    # Crawler Configuration
    default_workers: int = Field(3, env="DEFAULT_WORKERS")
    default_max_depth: int = Field(3, env="DEFAULT_MAX_DEPTH")
    default_max_pages: int = Field(4000, env="DEFAULT_MAX_PAGES")
    default_delay: float = Field(2.0, env="DEFAULT_DELAY")
    default_allowed_domains: List[str] = Field(["northeastern.edu", "nyu.edu", "stanford.edu", "mit.edu"], env="DEFAULT_ALLOWED_DOMAINS")
    
    # Security
    secret_key: str = Field("dev-secret-key-change-in-production", env="SECRET_KEY")
    access_token_expire_minutes: int = Field(30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # CORS
    cors_origins: List[str] = Field(["http://localhost:3000", "http://localhost:8080", "http://frontend:80"], env="CORS_ORIGINS")
    
    # Logging
    log_level: str = Field("DEBUG", env="LOG_LEVEL")
    
    # File Storage
    enable_local_save: bool = Field(True, env="ENABLE_LOCAL_SAVE")
    local_output_dir: str = Field("/app/crawler_output", env="LOCAL_OUTPUT_DIR")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        
        @classmethod
        def customise_sources(
            cls,
            init_settings,
            env_settings,
            file_secret_settings,
        ):
            return (
                env_settings,
                init_settings,
                file_secret_settings,
            )

# Global settings instance
settings = Settings()

# Load from JSON files for non-sensitive defaults, overriding with environment variables
CONFIG_PATH = Path(__file__).parent / "config.json"
LOCAL_CONFIG_PATH = Path(__file__).parent / "config_local.json"

# Load default config
if CONFIG_PATH.exists():
    with open(CONFIG_PATH, "r") as f:
        default_config = json.load(f)
    settings = Settings(**default_config)

# Load local config if it exists, overriding defaults
if LOCAL_CONFIG_PATH.exists():
    with open(LOCAL_CONFIG_PATH, "r") as f:
        local_config = json.load(f)
    settings = Settings(**{**default_config, **local_config})

# Environment variables will now override any values loaded from JSON files due to customise_sources
settings = Settings()
 