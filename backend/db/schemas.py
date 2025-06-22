"""
Pydantic schemas for data validation and serialization.
Defines the structure of request and response models.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId field for Pydantic models."""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    
    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")


class JobConfig(BaseModel):
    """Configuration for a crawl job."""
    
    workers: int = Field(default=2, ge=1, le=10)
    max_depth: int = Field(default=3, ge=1, le=10)
    max_pages: int = Field(default=1000, ge=1, le=100000)
    allowed_domains: List[str] = Field(default_factory=list)
    delay: float = Field(default=1.0, ge=0.1, le=10.0)
    timeout: int = Field(default=30, ge=5, le=300)
    user_agent: str = Field(default="WebCrawler/1.0")
    
    class Config:
        schema_extra = {
            "example": {
                "workers": 2,
                "max_depth": 3,
                "max_pages": 1000,
                "allowed_domains": ["example.com"],
                "delay": 1.0,
                "timeout": 30,
                "user_agent": "WebCrawler/1.0"
            }
        }


class JobBase(BaseModel):
    """Base job model with common fields."""
    
    name: str = Field(..., min_length=1, max_length=200)
    domain: str = Field(..., min_length=1, max_length=500)
    depth: int = Field(default=3, ge=1, le=10)
    priority: str = Field(default="medium", regex="^(high|medium|low)$")
    category: str = Field(default="General", max_length=100)
    config: JobConfig = Field(default_factory=JobConfig)
    urls: List[str] = Field(default_factory=list)
    
    @validator('domain')
    def validate_domain(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('Domain must be a valid URL')
        return v
    
    @validator('urls', each_item=True)
    def validate_urls(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URLs must be valid URLs')
        return v


class JobCreate(JobBase):
    """Schema for creating a new job."""
    
    scheduled: bool = Field(default=False)
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Test Crawl Job",
                "domain": "https://example.com",
                "depth": 2,
                "priority": "medium",
                "category": "Testing",
                "config": {
                    "workers": 2,
                    "max_depth": 2,
                    "max_pages": 100,
                    "allowed_domains": ["example.com"],
                    "delay": 1.0,
                    "timeout": 30,
                    "user_agent": "WebCrawler/1.0"
                },
                "urls": ["https://example.com"],
                "scheduled": False
            }
        }


class JobUpdate(BaseModel):
    """Schema for updating a job."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    domain: Optional[str] = Field(None, min_length=1, max_length=500)
    status: Optional[str] = Field(None, regex="^(queued|running|completed|paused|failed)$")
    priority: Optional[str] = Field(None, regex="^(high|medium|low)$")
    category: Optional[str] = Field(None, max_length=100)
    config: Optional[JobConfig] = None
    urls: Optional[List[str]] = None
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Updated Job Name",
                "status": "running",
                "priority": "high"
            }
        }


class JobResponse(JobBase):
    """Schema for job response."""
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    status: str = Field(default="queued")
    progress: float = Field(default=0.0, ge=0.0, le=100.0)
    pages_found: int = Field(default=0, ge=0)
    errors: int = Field(default=0, ge=0)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    estimated_end: Optional[datetime] = None
    scheduled: bool = Field(default=False)
    data_size: str = Field(default="0 MB")
    avg_response_time: str = Field(default="0s")
    success_rate: float = Field(default=0.0, ge=0.0, le=100.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "name": "Test Crawl Job",
                "domain": "https://example.com",
                "status": "queued",
                "progress": 0.0,
                "pages_found": 0,
                "errors": 0,
                "depth": 2,
                "priority": "medium",
                "category": "Testing",
                "scheduled": False,
                "data_size": "0 MB",
                "avg_response_time": "0s",
                "success_rate": 0.0,
                "config": {
                    "workers": 2,
                    "max_depth": 2,
                    "max_pages": 100,
                    "allowed_domains": ["example.com"],
                    "delay": 1.0,
                    "timeout": 30,
                    "user_agent": "WebCrawler/1.0"
                },
                "urls": ["https://example.com"],
                "created_at": "2025-06-22T16:58:47.347000",
                "updated_at": "2025-06-22T16:58:47.347000"
            }
        }


class JobListResponse(BaseModel):
    """Schema for job list response."""
    
    jobs: List[JobResponse]
    count: int
    total: int
    page: int = Field(default=1, ge=1)
    size: int = Field(default=100, ge=1, le=1000)
    
    class Config:
        schema_extra = {
            "example": {
                "jobs": [],
                "count": 0,
                "total": 0,
                "page": 1,
                "size": 100
            }
        }


class CrawlerStatus(BaseModel):
    """Schema for crawler status response."""
    
    crawler_running: bool
    uptime_seconds: float
    pages_crawled_total: int
    max_pages_configured: int
    pages_remaining_in_limit: int
    avg_pages_per_second: float
    frontier_queue_size: int
    urls_in_processing: int
    urls_completed_redis: int
    urls_seen_redis: int
    bloom_filter_items: int
    robots_denied_count: int
    total_errors_count: int
    active_workers_configured: int
    current_time_utc: str
    allowed_domains: List[str]
    
    class Config:
        schema_extra = {
            "example": {
                "crawler_running": True,
                "uptime_seconds": 120.5,
                "pages_crawled_total": 50,
                "max_pages_configured": 4000,
                "pages_remaining_in_limit": 3950,
                "avg_pages_per_second": 0.4,
                "frontier_queue_size": 100,
                "urls_in_processing": 5,
                "urls_completed_redis": 45,
                "urls_seen_redis": 150,
                "bloom_filter_items": 150,
                "robots_denied_count": 2,
                "total_errors_count": 1,
                "active_workers_configured": 3,
                "current_time_utc": "2025-06-22T17:20:00.000000",
                "allowed_domains": ["example.com", "test.com"]
            }
        }


class JobStats(BaseModel):
    """Schema for job statistics response."""
    
    queued: dict = Field(default_factory=dict)
    running: dict = Field(default_factory=dict)
    completed: dict = Field(default_factory=dict)
    failed: dict = Field(default_factory=dict)
    paused: dict = Field(default_factory=dict)
    
    class Config:
        schema_extra = {
            "example": {
                "queued": {"count": 5, "total_pages": 0, "total_errors": 0},
                "running": {"count": 2, "total_pages": 150, "total_errors": 3},
                "completed": {"count": 10, "total_pages": 5000, "total_errors": 25},
                "failed": {"count": 1, "total_pages": 50, "total_errors": 10},
                "paused": {"count": 0, "total_pages": 0, "total_errors": 0}
            }
        }


class JobModel(BaseModel):
    """Job model for database operations."""
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    config: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CrawlerConfigModel(BaseModel):
    """Crawler configuration model for API operations."""
    
    workers: int = Field(default=4, ge=1, le=20)
    max_depth: int = Field(default=3, ge=0, le=10)
    max_pages: int = Field(default=1000, ge=1, le=100000)
    default_delay: float = Field(default=1.0, ge=0.0, le=10.0)
    allowed_domains: Optional[List[str]] = None
    kafka_brokers: Optional[List[str]] = None
    output_topic: Optional[str] = None
    enable_kafka_output: bool = False
    enable_local_save: bool = True
    local_output_dir: str = "output"
    redis_host: str = "localhost"
    redis_port: int = 6379
    respect_robots_txt: bool = True
    user_agent: str = "DonutBot/1.0"
    
    class Config:
        schema_extra = {
            "example": {
                "workers": 4,
                "max_depth": 3,
                "max_pages": 1000,
                "default_delay": 1.0,
                "allowed_domains": ["example.com", "test.com"],
                "kafka_brokers": ["localhost:9092"],
                "output_topic": "crawler_output",
                "enable_kafka_output": False,
                "enable_local_save": True,
                "local_output_dir": "output",
                "redis_host": "localhost",
                "redis_port": 6379,
                "respect_robots_txt": True,
                "user_agent": "DonutBot/1.0"
            }
        }


class JobCreateRequest(BaseModel):
    """Request model for creating a new job."""
    
    name: str
    config: Optional[CrawlerConfigModel] = None


class JobUpdateRequest(BaseModel):
    """Request model for updating a job."""
    
    name: Optional[str] = None
    status: Optional[str] = None
    config: Optional[CrawlerConfigModel] = None
    results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class JobResponse(BaseModel):
    """Response model for job operations."""
    
    id: str
    name: str
    status: str
    created_at: datetime
    updated_at: datetime
    config: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()} 