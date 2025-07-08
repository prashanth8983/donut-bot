"""
Job service for managing crawl jobs.
Contains business logic for job operations.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Union
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

from db.database import Database
from db.schemas import JobCreate, JobUpdate, JobResponse, JobListResponse, JobStats
from exceptions import JobNotFoundError, JobAlreadyExistsError, InvalidJobStateError, DatabaseError
from core.logger import get_logger
from core.utils import convert_datetimes

logger = get_logger("job_service")


class JobService:
    """Service for managing crawl jobs."""
    
    def __init__(self, database: Database):
        self.database = database
        self.collection: Optional[AsyncIOMotorCollection] = None
        try:
            self.collection = database.get_collection("jobs")
        except Exception as e:
            logger.warning(f"Database collection not available: {e}")
    
    def _check_database(self):
        """Check if database is available."""
        if self.collection is None:
            raise DatabaseError("Database not available")
    
    async def create_job(self, job_data: JobCreate) -> JobResponse:
        """Create a new crawl job."""
        self._check_database()
        
        try:
            # Check for duplicate job names if name is provided
            if hasattr(job_data, 'name') and job_data.name:
                existing = await self.collection.find_one({"name": job_data.name})
                if existing:
                    raise JobAlreadyExistsError(f"Job with name '{job_data.name}' already exists")
            
            # Convert Pydantic model to dict - use model_dump() for Pydantic v2
            if hasattr(job_data, 'model_dump'):
                job_dict = job_data.model_dump()
            else:
                job_dict = job_data.dict()  # Fallback for Pydantic v1
            
            # Set default values
            now = datetime.now(timezone.utc)
            job_dict.update({
                "created_at": now,
                "updated_at": now,
                "status": "queued",
                "progress": 0.0,
                "pages_found": 0,
                "errors": 0,
                "data_size": "0 MB",
                "avg_response_time": "0s",
                "success_rate": 0.0,
                "start_time": None,
                "end_time": None,
                "elapsed_seconds": 0
            })
            
            # Insert into database
            result = await self.collection.insert_one(job_dict)
            
            if not result.inserted_id:
                raise DatabaseError("Failed to insert job - no ID returned")
            
            # Get the created job
            created_job = await self.get_job_by_id(str(result.inserted_id))
            if not created_job:
                raise DatabaseError("Failed to retrieve created job")
            
            logger.info(f"Created job: {created_job.name} (ID: {created_job.id})")
            return created_job
            
        except (JobAlreadyExistsError, DatabaseError):
            raise
        except Exception as e:
            logger.error(f"Failed to create job: {e}")
            raise DatabaseError(f"Job creation failed: {str(e)}")
    
    async def get_job_by_id(self, job_id: str) -> Optional[JobResponse]:
        """Get a job by ID."""
        if self.collection is None:
            logger.warning("Database not available")
            return None
            
        try:
            if not job_id or not ObjectId.is_valid(job_id):
                logger.warning(f"Invalid job ID format: {job_id}")
                return None
            
            doc = await self.collection.find_one({"_id": ObjectId(job_id)})
            if doc:
                # Convert _id to id for the Pydantic model
                doc["id"] = str(doc["_id"])
                # Remove the original _id to avoid conflicts
                del doc["_id"]
                # Ensure all required fields are present with defaults
                doc.setdefault("name", "Unknown Job")
                doc.setdefault("domain", "https://example.com")
                doc.setdefault("depth", 3)
                doc.setdefault("priority", "medium")
                doc.setdefault("category", "General")
                doc.setdefault("config", {})
                doc.setdefault("urls", [])
                doc.setdefault("status", "queued")
                doc.setdefault("progress", 0.0)
                doc.setdefault("pages_found", 0)
                doc.setdefault("errors", 0)
                doc.setdefault("scheduled", False)
                doc.setdefault("data_size", "0 MB")
                doc.setdefault("avg_response_time", "0s")
                doc.setdefault("success_rate", 0.0)
                doc.setdefault("created_at", datetime.now(timezone.utc))
                doc.setdefault("updated_at", datetime.now(timezone.utc))
                return JobResponse(**doc)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get job {job_id}: {e}")
            return None
    
    async def get_jobs(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        domain: Optional[str] = None,
        scheduled: Optional[bool] = None,
        page: int = 1,
        size: int = 100
    ) -> JobListResponse:
        """Get jobs with optional filtering and pagination."""
        self._check_database()
        try:
            # Validate pagination parameters
            if page < 1:
                page = 1
            if size < 1 or size > 1000:  # Limit max size
                size = min(max(size, 1), 1000)
            
            # Build filter query
            filter_query = {}
            if status:
                filter_query["status"] = status
            if priority:
                filter_query["priority"] = priority
            if domain:
                filter_query["domain"] = domain
            if scheduled is not None:
                filter_query["scheduled"] = scheduled
            
            # Calculate skip for pagination
            skip = (page - 1) * size
            
            # Get total count
            total = await self.collection.count_documents(filter_query)
            
            # Get jobs with pagination, sorted by created_at desc
            cursor = self.collection.find(filter_query).sort("created_at", -1).skip(skip).limit(size)
            jobs = []
            
            async for doc in cursor:
                try:
                    # Convert _id to id field for PyObjectId alias
                    if "_id" in doc and doc["_id"] is not None:
                        # Convert _id to id for the Pydantic model
                        doc["id"] = str(doc["_id"])
                        # Remove the original _id to avoid conflicts
                        del doc["_id"]
                        # Ensure all required fields are present with defaults
                        doc.setdefault("name", "Unknown Job")
                        doc.setdefault("domain", "https://example.com")
                        doc.setdefault("depth", 3)
                        doc.setdefault("priority", "medium")
                        doc.setdefault("category", "General")
                        doc.setdefault("config", {})
                        doc.setdefault("urls", [])
                        doc.setdefault("status", "queued")
                        doc.setdefault("progress", 0.0)
                        doc.setdefault("pages_found", 0)
                        doc.setdefault("errors", 0)
                        doc.setdefault("scheduled", False)
                        doc.setdefault("data_size", "0 MB")
                        doc.setdefault("avg_response_time", "0s")
                        doc.setdefault("success_rate", 0.0)
                        doc.setdefault("created_at", datetime.now(timezone.utc))
                        doc.setdefault("updated_at", datetime.now(timezone.utc))
                        job = JobResponse(**doc)
                        jobs.append(job)
                    else:
                        logger.warning(f"Skipping job with null _id: {doc}")
                except Exception as job_error:
                    logger.error(f"Error processing job document: {job_error}")
                    continue
            
            return JobListResponse(
                jobs=jobs,
                count=len(jobs),
                total=total,
                page=page,
                size=size
            )
            
        except Exception as e:
            logger.error(f"Error getting jobs: {e}")
            raise DatabaseError(f"Failed to get jobs: {str(e)}")
    
    async def update_job(self, job_id: str, job_data: JobUpdate) -> Optional[JobResponse]:
        """Update a job."""
        try:
            if not job_id or not ObjectId.is_valid(job_id):
                raise JobNotFoundError(f"Invalid job ID: {job_id}")
            
            # Check if job exists
            existing_job = await self.get_job_by_id(job_id)
            if not existing_job:
                raise JobNotFoundError(f"Job not found: {job_id}")
            
            # Prepare update data - use model_dump() for Pydantic v2
            if hasattr(job_data, 'model_dump'):
                update_data = job_data.model_dump(exclude_unset=True)
            else:
                update_data = job_data.dict(exclude_unset=True)  # Fallback for Pydantic v1
            
            if not update_data:
                logger.info(f"No changes to update for job {job_id}")
                return existing_job
            
            update_data["updated_at"] = datetime.now(timezone.utc)
            
            # Update in database
            result = await self.collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.info(f"Updated job {job_id} with fields: {list(update_data.keys())}")
                return await self.get_job_by_id(job_id)
            
            return existing_job
            
        except (JobNotFoundError, DatabaseError):
            raise
        except Exception as e:
            logger.error(f"Failed to update job {job_id}: {e}")
            raise DatabaseError(f"Job update failed: {str(e)}")
    
    async def delete_job(self, job_id: str) -> bool:
        """Delete a job."""
        try:
            if not job_id or not ObjectId.is_valid(job_id):
                logger.warning(f"Invalid job ID for deletion: {job_id}")
                return False
            
            # Check if job exists before deletion
            existing_job = await self.get_job_by_id(job_id)
            if not existing_job:
                logger.warning(f"Job not found for deletion: {job_id}")
                return False
            
            # Prevent deletion of running jobs
            if existing_job.status == "running":
                raise InvalidJobStateError("Cannot delete a running job. Stop the job first.")
            
            result = await self.collection.delete_one({"_id": ObjectId(job_id)})
            success = result.deleted_count > 0
            
            if success:
                logger.info(f"Deleted job: {existing_job.name} (ID: {job_id})")
            
            return success
            
        except InvalidJobStateError:
            raise
        except Exception as e:
            logger.error(f"Failed to delete job {job_id}: {e}")
            return False
    
    async def start_job(self, job_id: str) -> bool:
        """Start a job."""
        try:
            job = await self.get_job_by_id(job_id)
            if not job:
                raise JobNotFoundError(f"Job not found: {job_id}")
            
            # Check valid state transitions
            if job.status == "running":
                raise InvalidJobStateError(f"Job is already running")
            elif job.status == "completed":
                raise InvalidJobStateError(f"Cannot restart a completed job")
            
            now = datetime.now(timezone.utc)
            update_data = {
                "status": "running",
                "start_time": now,
                "end_time": None,
                "progress": 0.0,
                "updated_at": now
            }
            
            # If job is queued, reset elapsed_seconds; if resuming, keep it
            if job.status == "queued":
                update_data["elapsed_seconds"] = 0
            
            result = await self.collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.info(f"Started job: {job.name} (ID: {job_id})")
                return True
            
            logger.warning(f"Failed to update job status for {job_id}")
            return False
            
        except (JobNotFoundError, InvalidJobStateError):
            raise
        except Exception as e:
            logger.error(f"Failed to start job {job_id}: {e}")
            raise DatabaseError(f"Failed to start job: {str(e)}")
    
    async def stop_job(self, job_id: str) -> bool:
        """Stop a job."""
        try:
            job = await self.get_job_by_id(job_id)
            if not job:
                raise JobNotFoundError(f"Job not found: {job_id}")
            
            if job.status != "running":
                raise InvalidJobStateError(f"Job is not running (current status: {job.status})")
            
            now = datetime.now(timezone.utc)
            # Calculate elapsed_seconds
            elapsed = job.elapsed_seconds or 0
            if job.start_time:
                elapsed += int((now - job.start_time).total_seconds())
            update_data = {
                "status": "paused",
                "end_time": now,
                "updated_at": now,
                "elapsed_seconds": elapsed
            }
            result = await self.collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            if result.modified_count > 0:
                logger.info(f"Stopped job: {job.name} (ID: {job_id})")
                return True
            logger.warning(f"Failed to update job status for {job_id}")
            return False
            
        except (JobNotFoundError, InvalidJobStateError):
            raise
        except Exception as e:
            logger.error(f"Failed to stop job {job_id}: {e}")
            raise DatabaseError(f"Failed to stop job: {str(e)}")
    
    async def resume_job(self, job_id: str) -> bool:
        """Resume a paused job."""
        try:
            job = await self.get_job_by_id(job_id)
            if not job:
                raise JobNotFoundError(f"Job not found: {job_id}")
            
            # Check valid state transitions
            if job.status == "running":
                raise InvalidJobStateError(f"Job is already running")
            elif job.status == "completed":
                raise InvalidJobStateError(f"Cannot resume a completed job")
            elif job.status != "paused":
                raise InvalidJobStateError(f"Job is not paused (current status: {job.status})")
            
            now = datetime.now(timezone.utc)
            update_data = {
                "status": "running",
                "start_time": now,
                "end_time": None,
                "updated_at": now
            }
            result = await self.collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            if result.modified_count > 0:
                logger.info(f"Resumed job: {job.name} (ID: {job_id})")
                return True
            logger.warning(f"Failed to update job status for {job_id}")
            return False
            
        except (JobNotFoundError, InvalidJobStateError):
            raise
        except Exception as e:
            logger.error(f"Failed to resume job {job_id}: {e}")
            raise DatabaseError(f"Failed to resume job: {str(e)}")

    async def pause_job(self, job_id: str) -> bool:
        """Pause a running job."""
        try:
            job = await self.get_job_by_id(job_id)
            if not job:
                raise JobNotFoundError(f"Job not found: {job_id}")
            
            if job.status != "running":
                raise InvalidJobStateError(f"Job is not running (current status: {job.status})")
            
            now = datetime.now(timezone.utc)
            # Calculate elapsed_seconds
            elapsed = job.elapsed_seconds or 0
            if job.start_time:
                elapsed += int((now - job.start_time).total_seconds())
            update_data = {
                "status": "paused",
                "end_time": now,
                "updated_at": now,
                "elapsed_seconds": elapsed
            }
            result = await self.collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            if result.modified_count > 0:
                logger.info(f"Paused job: {job.name} (ID: {job_id})")
                return True
            logger.warning(f"Failed to update job status for {job_id}")
            return False
            
        except (JobNotFoundError, InvalidJobStateError):
            raise
        except Exception as e:
            logger.error(f"Failed to pause job {job_id}: {e}")
            raise DatabaseError(f"Failed to pause job: {str(e)}")
    
    async def get_job_stats(self) -> JobStats:
        """Get job statistics."""
        try:
            pipeline = [
                {
                    "$match": {"_id": {"$ne": None}}  # Exclude malformed documents
                },
                {
                    "$group": {
                        "_id": "$status",
                        "count": {"$sum": 1},
                        "total_pages": {"$sum": {"$ifNull": ["$pages_found", 0]}},
                        "total_errors": {"$sum": {"$ifNull": ["$errors", 0]}}
                    }
                }
            ]
            
            stats = JobStats()
            async for doc in self.collection.aggregate(pipeline):
                status = doc["_id"]
                status_data = {
                    "count": doc["count"],
                    "total_pages": doc["total_pages"],
                    "total_errors": doc["total_errors"]
                }
                
                # Dynamically set attributes based on status
                if hasattr(stats, status):
                    setattr(stats, status, status_data)
                else:
                    logger.warning(f"Unknown job status in stats: {status}")
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get job stats: {e}")
            return JobStats()
    
    async def cleanup_malformed_jobs(self) -> int:
        """Remove jobs with null _id values (malformed documents)."""
        try:
            # Also clean up documents with other malformed fields
            malformed_filter = {
                "$or": [
                    {"_id": None},
                    {"_id": {"$exists": False}},
                    {"status": {"$exists": False}},
                    {"created_at": {"$exists": False}}
                ]
            }
            
            result = await self.collection.delete_many(malformed_filter)
            if result.deleted_count > 0:
                logger.info(f"Cleaned up {result.deleted_count} malformed job documents")
            return result.deleted_count
        except Exception as e:
            logger.error(f"Failed to cleanup malformed jobs: {e}")
            return 0
    
    async def complete_job(self, job_id: str, final_stats: Optional[Dict[str, Any]] = None) -> bool:
        """Mark a job as completed with optional final statistics."""
        try:
            job = await self.get_job_by_id(job_id)
            if not job:
                raise JobNotFoundError(f"Job not found: {job_id}")
            
            if job.status == "completed":
                logger.info(f"Job {job_id} is already completed")
                return True
            
            now = datetime.now(timezone.utc)
            elapsed = job.elapsed_seconds or 0
            if job.status == "running" and job.start_time:
                elapsed += int((now - job.start_time).total_seconds())
            update_data = {
                "status": "completed",
                "end_time": now,
                "updated_at": now,
                "progress": 100.0,
                "elapsed_seconds": elapsed
            }
            
            # Add final statistics if provided
            if final_stats:
                update_data.update(final_stats)
            
            result = await self.collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.info(f"Completed job: {job.name} (ID: {job_id})")
                return True
            
            return False
            
        except (JobNotFoundError, DatabaseError):
            raise
        except Exception as e:
            logger.error(f"Failed to complete job {job_id}: {e}")
            raise DatabaseError(f"Failed to complete job: {str(e)}")
    
    async def update_job_progress(self, job_id: str, progress: float, stats: Optional[Dict[str, Any]] = None) -> bool:
        """Update job progress and optional statistics."""
        try:
            if not 0 <= progress <= 100:
                raise ValueError("Progress must be between 0 and 100")
            
            update_data = {
                "progress": progress,
                "updated_at": datetime.now(timezone.utc)
            }
            
            if stats:
                update_data.update(stats)
            
            result = await self.collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to update job progress {job_id}: {e}")
            return False