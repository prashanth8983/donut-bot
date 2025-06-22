"""
Job service for managing crawl jobs.
Contains business logic for job operations.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from bson import ObjectId

from ..db.database import Database
from ..db.schemas import JobCreate, JobUpdate, JobResponse, JobListResponse, JobStats
from ..exceptions import JobNotFoundError, JobAlreadyExistsError, InvalidJobStateError, DatabaseError
from ..core.logger import get_logger
from ..core.utils import convert_datetimes

logger = get_logger("job_service")


class JobService:
    """Service for managing crawl jobs."""
    
    def __init__(self, database: Database):
        self.database = database
        self.collection = database.get_collection("jobs")
    
    async def create_job(self, job_data: JobCreate) -> JobResponse:
        """Create a new crawl job."""
        try:
            # Convert Pydantic model to dict
            job_dict = job_data.dict()
            job_dict["created_at"] = datetime.now(timezone.utc)
            job_dict["updated_at"] = datetime.now(timezone.utc)
            job_dict["status"] = "queued"
            job_dict["progress"] = 0.0
            job_dict["pages_found"] = 0
            job_dict["errors"] = 0
            job_dict["data_size"] = "0 MB"
            job_dict["avg_response_time"] = "0s"
            job_dict["success_rate"] = 0.0
            
            # Insert into database
            result = await self.collection.insert_one(job_dict)
            
            # Get the created job
            created_job = await self.get_job_by_id(str(result.inserted_id))
            if not created_job:
                raise DatabaseError("Failed to retrieve created job")
            
            logger.info(f"Created job: {created_job.name} (ID: {created_job.id})")
            return created_job
            
        except Exception as e:
            logger.error(f"Failed to create job: {e}")
            raise DatabaseError(f"Job creation failed: {e}")
    
    async def get_job_by_id(self, job_id: str) -> Optional[JobResponse]:
        """Get a job by ID."""
        try:
            if not ObjectId.is_valid(job_id):
                return None
            
            doc = await self.collection.find_one({"_id": ObjectId(job_id)})
            if doc:
                # Convert MongoDB document to JobResponse
                doc["_id"] = str(doc["_id"])
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
        try:
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
            
            # Get jobs with pagination
            cursor = self.collection.find(filter_query).skip(skip).limit(size)
            jobs = []
            
            async for doc in cursor:
                # Convert MongoDB document to JobResponse
                doc["_id"] = str(doc["_id"])
                job = JobResponse(**doc)
                jobs.append(job)
            
            return JobListResponse(
                jobs=jobs,
                count=len(jobs),
                total=total,
                page=page,
                size=size
            )
            
        except Exception as e:
            logger.error(f"Error getting jobs: {e}")
            raise DatabaseError(f"Failed to get jobs: {e}")
    
    async def update_job(self, job_id: str, job_data: JobUpdate) -> Optional[JobResponse]:
        """Update a job."""
        try:
            if not ObjectId.is_valid(job_id):
                raise JobNotFoundError(f"Invalid job ID: {job_id}")
            
            # Check if job exists
            existing_job = await self.get_job_by_id(job_id)
            if not existing_job:
                raise JobNotFoundError(f"Job not found: {job_id}")
            
            # Prepare update data
            update_data = job_data.dict(exclude_unset=True)
            update_data["updated_at"] = datetime.now(timezone.utc)
            
            # Update in database
            result = await self.collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                return await self.get_job_by_id(job_id)
            return existing_job
            
        except JobNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to update job {job_id}: {e}")
            raise DatabaseError(f"Job update failed: {e}")
    
    async def delete_job(self, job_id: str) -> bool:
        """Delete a job."""
        try:
            if not ObjectId.is_valid(job_id):
                return False
            
            result = await self.collection.delete_one({"_id": ObjectId(job_id)})
            success = result.deleted_count > 0
            
            if success:
                logger.info(f"Deleted job: {job_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete job {job_id}: {e}")
            return False
    
    async def start_job(self, job_id: str) -> bool:
        """Start a job."""
        try:
            job = await self.get_job_by_id(job_id)
            if not job:
                raise JobNotFoundError(f"Job not found: {job_id}")
            
            if job.status in ["running", "completed"]:
                raise InvalidJobStateError(f"Job is already {job.status}")
            
            # Update job status
            update_data = {
                "status": "running",
                "start_time": datetime.now(timezone.utc),
                "progress": 0.0,
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = await self.collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.info(f"Started job: {job.name} (ID: {job_id})")
                return True
            
            return False
            
        except (JobNotFoundError, InvalidJobStateError):
            raise
        except Exception as e:
            logger.error(f"Failed to start job {job_id}: {e}")
            return False
    
    async def stop_job(self, job_id: str) -> bool:
        """Stop a job."""
        try:
            job = await self.get_job_by_id(job_id)
            if not job or job.status != "running":
                raise InvalidJobStateError("Job is not running")
            
            # Update job status
            update_data = {
                "status": "paused",
                "end_time": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = await self.collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.info(f"Stopped job: {job.name} (ID: {job_id})")
                return True
            
            return False
            
        except InvalidJobStateError:
            raise
        except Exception as e:
            logger.error(f"Failed to stop job {job_id}: {e}")
            return False
    
    async def get_job_stats(self) -> JobStats:
        """Get job statistics."""
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": "$status",
                        "count": {"$sum": 1},
                        "total_pages": {"$sum": "$pages_found"},
                        "total_errors": {"$sum": "$errors"}
                    }
                }
            ]
            
            stats = JobStats()
            async for doc in self.collection.aggregate(pipeline):
                status = doc["_id"]
                if hasattr(stats, status):
                    setattr(stats, status, {
                        "count": doc["count"],
                        "total_pages": doc["total_pages"],
                        "total_errors": doc["total_errors"]
                    })
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get job stats: {e}")
            return JobStats()
    
    async def cleanup_malformed_jobs(self) -> int:
        """Remove jobs with null _id values (malformed documents)."""
        try:
            result = await self.collection.delete_many({"_id": None})
            if result.deleted_count > 0:
                logger.info(f"Cleaned up {result.deleted_count} malformed job documents")
            return result.deleted_count
        except Exception as e:
            logger.error(f"Failed to cleanup malformed jobs: {e}")
            return 0 