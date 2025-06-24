"""
Fixed Pydantic schemas for MongoDB integration with Pydantic v2 compatibility.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict, field_validator, field_serializer
from pydantic.functional_validators import BeforeValidator
from typing_extensions import Annotated


def validate_object_id(v: Any) -> ObjectId:
    """Validate and convert various inputs to ObjectId."""
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str):
        if ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError(f"Invalid ObjectId: {v}")
    raise ValueError(f"ObjectId expected, got {type(v)}")


def serialize_object_id(v: ObjectId) -> str:
    """Serialize ObjectId to string."""
    return str(v)


# Custom ObjectId type with proper validation and serialization
PyObjectId = Annotated[
    ObjectId,
    BeforeValidator(validate_object_id),
]


class MongoBaseModel(BaseModel):
    """Base model for MongoDB documents with proper configuration."""
    
    # Pydantic v2 configuration
    model_config = ConfigDict(
        # Renamed from allow_population_by_field_name
        populate_by_name=True,
        # Renamed from schema_extra  
        json_schema_extra={
            "example": {}
        },
        # Allow arbitrary types like ObjectId
        arbitrary_types_allowed=True,
        # Use enum values in serialization
        use_enum_values=True,
        # Validate assignment
        validate_assignment=True,
    )


class JobBase(MongoBaseModel):
    """Base job schema with common fields."""
    name: str = Field(..., min_length=1, max_length=100, description="Job name")
    domain: str = Field(..., description="Domain to crawl")
    priority: str = Field(default="medium", description="Job priority")
    scheduled: bool = Field(default=False, description="Is job scheduled")
    
    # Optional fields with defaults
    max_pages: Optional[int] = Field(default=1000, ge=1, description="Maximum pages to crawl")
    max_depth: Optional[int] = Field(default=3, ge=1, description="Maximum crawl depth")
    description: Optional[str] = Field(default="", max_length=500, description="Job description")
    tags: Optional[List[str]] = Field(default_factory=list, description="Job tags")
    
    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v):
        valid_priorities = ['low', 'medium', 'high', 'urgent']
        if v not in valid_priorities:
            raise ValueError(f'Priority must be one of: {valid_priorities}')
        return v
    
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v):
        if v and len(v) > 10:
            raise ValueError('Maximum 10 tags allowed')
        return v


class JobCreate(JobBase):
    """Schema for creating a new job."""
    pass


class JobUpdate(MongoBaseModel):
    """Schema for updating an existing job."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    domain: Optional[str] = Field(None)
    priority: Optional[str] = Field(None)
    scheduled: Optional[bool] = Field(None)
    max_pages: Optional[int] = Field(None, ge=1)
    max_depth: Optional[int] = Field(None, ge=1)
    description: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = Field(None)
    
    # Runtime fields that can be updated
    status: Optional[str] = Field(None)
    progress: Optional[float] = Field(None, ge=0.0, le=100.0)
    pages_found: Optional[int] = Field(None, ge=0)
    errors: Optional[int] = Field(None, ge=0)
    data_size: Optional[str] = Field(None)
    avg_response_time: Optional[str] = Field(None)
    success_rate: Optional[float] = Field(None, ge=0.0, le=100.0)
    
    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v):
        if v is not None:
            valid_priorities = ['low', 'medium', 'high', 'urgent']
            if v not in valid_priorities:
                raise ValueError(f'Priority must be one of: {valid_priorities}')
        return v
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ['queued', 'running', 'paused', 'completed', 'failed', 'cancelled']
            if v not in valid_statuses:
                raise ValueError(f'Status must be one of: {valid_statuses}')
        return v


class JobResponse(JobBase):
    """Schema for job responses."""
    # Use string for id field to avoid serialization issues
    id: str = Field(alias="_id", description="Job ID")
    
    # Runtime fields
    status: str = Field(default="queued", description="Job status")
    progress: float = Field(default=0.0, ge=0.0, le=100.0, description="Job progress percentage")
    pages_found: int = Field(default=0, ge=0, description="Number of pages found")
    errors: int = Field(default=0, ge=0, description="Number of errors")
    data_size: str = Field(default="0 MB", description="Amount of data crawled")
    avg_response_time: str = Field(default="0s", description="Average response time")
    success_rate: float = Field(default=0.0, ge=0.0, le=100.0, description="Success rate percentage")
    
    # Timestamps
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")
    start_time: Optional[datetime] = Field(default=None, description="Job start time")
    end_time: Optional[datetime] = Field(default=None, description="Job end time")
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        valid_statuses = ['queued', 'running', 'paused', 'completed', 'failed', 'cancelled']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {valid_statuses}')
        return v
    
    @field_serializer('id', when_used='json')
    def serialize_id(self, v):
        if isinstance(v, ObjectId):
            return str(v)
        return v


class JobListResponse(MongoBaseModel):
    """Schema for paginated job list responses."""
    jobs: List[JobResponse] = Field(description="List of jobs")
    count: int = Field(ge=0, description="Number of jobs in current page")
    total: int = Field(ge=0, description="Total number of jobs")
    page: int = Field(ge=1, description="Current page number")
    size: int = Field(ge=1, description="Page size")
    
    @property
    def total_pages(self) -> int:
        """Calculate total number of pages."""
        if self.size <= 0:
            return 0
        return (self.total + self.size - 1) // self.size
    
    @property
    def has_next(self) -> bool:
        """Check if there are more pages."""
        return self.page < self.total_pages
    
    @property
    def has_previous(self) -> bool:
        """Check if there are previous pages."""
        return self.page > 1


class JobStatsItem(MongoBaseModel):
    """Schema for individual job status statistics."""
    count: int = Field(ge=0, description="Number of jobs")
    total_pages: int = Field(ge=0, description="Total pages found")
    total_errors: int = Field(ge=0, description="Total errors")


class JobStats(MongoBaseModel):
    """Schema for job statistics."""
    queued: JobStatsItem = Field(default_factory=lambda: JobStatsItem(count=0, total_pages=0, total_errors=0))
    running: JobStatsItem = Field(default_factory=lambda: JobStatsItem(count=0, total_pages=0, total_errors=0))
    paused: JobStatsItem = Field(default_factory=lambda: JobStatsItem(count=0, total_pages=0, total_errors=0))
    completed: JobStatsItem = Field(default_factory=lambda: JobStatsItem(count=0, total_pages=0, total_errors=0))
    failed: JobStatsItem = Field(default_factory=lambda: JobStatsItem(count=0, total_pages=0, total_errors=0))
    cancelled: JobStatsItem = Field(default_factory=lambda: JobStatsItem(count=0, total_pages=0, total_errors=0))
    
    @property
    def total_jobs(self) -> int:
        """Calculate total number of jobs across all statuses."""
        return (self.queued.count + self.running.count + self.paused.count + 
                self.completed.count + self.failed.count + self.cancelled.count)
    
    @property
    def total_pages_crawled(self) -> int:
        """Calculate total pages crawled across all jobs."""
        return (self.queued.total_pages + self.running.total_pages + self.paused.total_pages + 
                self.completed.total_pages + self.failed.total_pages + self.cancelled.total_pages)


# Legacy PyObjectId class for backward compatibility
class LegacyPyObjectId(ObjectId):
    """Legacy PyObjectId for backward compatibility."""
    
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


# Error response schemas
class ErrorDetail(MongoBaseModel):
    """Schema for error details."""
    message: str = Field(description="Error message")
    code: Optional[str] = Field(default=None, description="Error code")
    field: Optional[str] = Field(default=None, description="Field that caused the error")


class ErrorResponse(MongoBaseModel):
    """Schema for error responses."""
    error: str = Field(description="Error type")
    detail: Union[str, List[ErrorDetail]] = Field(description="Error details")
    timestamp: datetime = Field(description="Error timestamp")
    
    
# Health check schemas
class HealthStatus(MongoBaseModel):
    """Schema for health check responses."""
    status: str = Field(description="Service status")
    service: str = Field(description="Service name")
    timestamp: str = Field(description="Check timestamp")


class DetailedHealthStatus(HealthStatus):
    """Schema for detailed health check responses."""
    database: str = Field(description="Database status")
    response_time_ms: float = Field(description="Response time in milliseconds")
    checks: Dict[str, Any] = Field(description="Detailed check results")


# Export commonly used schemas
__all__ = [
    'PyObjectId',
    'MongoBaseModel',
    'JobBase',
    'JobCreate', 
    'JobUpdate',
    'JobResponse',
    'JobListResponse',
    'JobStats',
    'JobStatsItem',
    'ErrorDetail',
    'ErrorResponse',
    'HealthStatus',
    'DetailedHealthStatus',
    'LegacyPyObjectId'
]

# Scheduled Job Schemas
class ScheduledJobBase(MongoBaseModel):
    """Base scheduled job model with common fields."""
    name: str = Field(..., min_length=1, max_length=100, description="Scheduled job name")
    domain: str = Field(..., description="Domain to crawl")
    schedule: str = Field(..., description="Cron expression for scheduling")
    priority: str = Field(default="medium", description="Job priority")
    max_pages: Optional[int] = Field(default=1000, ge=1, description="Maximum pages to crawl")
    max_depth: Optional[int] = Field(default=3, ge=1, description="Maximum crawl depth")
    description: Optional[str] = Field(default="", max_length=500, description="Job description")
    tags: Optional[List[str]] = Field(default_factory=list, description="Job tags")
    
    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v):
        valid_priorities = ['low', 'medium', 'high', 'urgent']
        if v not in valid_priorities:
            raise ValueError(f'Priority must be one of: {valid_priorities}')
        return v


class ScheduledJobCreate(ScheduledJobBase):
    """Schema for creating a new scheduled job."""
    pass


class ScheduledJobUpdate(MongoBaseModel):
    """Schema for updating a scheduled job."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    domain: Optional[str] = Field(None)
    schedule: Optional[str] = Field(None, description="Cron expression for scheduling")
    status: Optional[str] = Field(None, description="Job status")
    priority: Optional[str] = Field(None)
    max_pages: Optional[int] = Field(None, ge=1)
    max_depth: Optional[int] = Field(None, ge=1)
    description: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = Field(None)
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ['enabled', 'disabled', 'running', 'failed']
            if v not in valid_statuses:
                raise ValueError(f'Status must be one of: {valid_statuses}')
        return v


class ScheduledJobResponse(ScheduledJobBase):
    """Schema for scheduled job response."""
    id: str = Field(alias="_id", description="Scheduled job ID")
    status: str = Field(default="enabled", description="Job status")
    next_run: datetime = Field(description="Next scheduled run time")
    last_run: Optional[datetime] = Field(default=None, description="Last run time")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")


class ScheduledJobListResponse(MongoBaseModel):
    """Schema for scheduled job list response."""
    scheduled_jobs: List[ScheduledJobResponse] = Field(description="List of scheduled jobs")
    count: int = Field(ge=0, description="Number of jobs in current page")
    total: int = Field(ge=0, description="Total number of jobs")
    page: int = Field(ge=1, description="Current page number")
    size: int = Field(ge=1, description="Page size")


# Update __all__ to include scheduled job schemas
__all__ = [
    'PyObjectId',
    'MongoBaseModel',
    'JobBase',
    'JobCreate', 
    'JobUpdate',
    'JobResponse',
    'JobListResponse',
    'JobStats',
    'JobStatsItem',
    'ErrorDetail',
    'ErrorResponse',
    'HealthStatus',
    'DetailedHealthStatus',
    'LegacyPyObjectId',
    'ScheduledJobBase',
    'ScheduledJobCreate',
    'ScheduledJobUpdate',
    'ScheduledJobResponse',
    'ScheduledJobListResponse'
] 

class CrawlerConfigModel(MongoBaseModel):
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

class NextRun(MongoBaseModel):
    """Schema for next run information."""
    id: str = Field(alias="_id")
    name: str
    domain: str
    next_run: datetime
    schedule: str
    priority: str

class NextRunsResponse(MongoBaseModel):
    """Schema for next runs response."""
    next_runs: List[NextRun]
    count: int

# Update __all__ to include NextRun and NextRunsResponse
__all__ = [
    'PyObjectId',
    'MongoBaseModel',
    'JobBase',
    'JobCreate', 
    'JobUpdate',
    'JobResponse',
    'JobListResponse',
    'JobStats',
    'JobStatsItem',
    'ErrorDetail',
    'ErrorResponse',
    'HealthStatus',
    'DetailedHealthStatus',
    'LegacyPyObjectId',
    'ScheduledJobBase',
    'ScheduledJobCreate',
    'ScheduledJobUpdate',
    'ScheduledJobResponse',
    'ScheduledJobListResponse',
    'CrawlerConfigModel',
    'NextRun',
    'NextRunsResponse'
] 