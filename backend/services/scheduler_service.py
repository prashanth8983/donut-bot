"""
Scheduler service for managing scheduled crawl jobs.
Handles job scheduling, execution, and management.
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from croniter import croniter
from pymongo import ASCENDING
from bson import ObjectId

from db.database import Database, get_database
from db.schemas import ScheduledJobCreate, ScheduledJobUpdate, ScheduledJobResponse, ScheduledJobListResponse
from core.logger import get_logger
from exceptions import DatabaseError, JobNotFoundError
from services.job_service import JobService
from db.schemas import JobCreate

logger = get_logger("scheduler_service")


class SchedulerService:
    """Service for managing scheduled crawl jobs."""
    
    def __init__(self, database: Database):
        self.database = database
        if not database.client:
            raise ValueError("Database client not initialized")
        self.collection = database.client.donut_bot.scheduled_jobs
        self.job_service = JobService(database)
        self.scheduler_task: Optional[asyncio.Task] = None
        self.running = False
        
    async def initialize(self):
        """Initialize the scheduler service."""
        try:
            # Create indexes
            await self.collection.create_index([("next_run", ASCENDING)])
            await self.collection.create_index([("status", ASCENDING)])
            await self.collection.create_index([("domain", ASCENDING)])
            
            # Start scheduler loop
            self.running = True
            self.scheduler_task = asyncio.create_task(self._scheduler_loop())
            
            logger.info("Scheduler service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize scheduler service: {e}")
            raise DatabaseError(f"Scheduler initialization failed: {e}")
    
    async def close(self):
        """Close the scheduler service."""
        try:
            self.running = False
            if self.scheduler_task:
                self.scheduler_task.cancel()
                try:
                    await self.scheduler_task
                except asyncio.CancelledError:
                    pass
            
            logger.info("Scheduler service closed")
            
        except Exception as e:
            logger.error(f"Error closing scheduler service: {e}")
    
    async def create_scheduled_job(self, job_data: ScheduledJobCreate) -> ScheduledJobResponse:
        """Create a new scheduled job."""
        try:
            # Validate cron expression
            try:
                croniter(job_data.schedule)
            except Exception as e:
                raise ValueError(f"Invalid cron expression: {e}")
            
            # Calculate next run time
            cron = croniter(job_data.schedule, datetime.now(timezone.utc))
            next_run = cron.get_next(datetime)
            
            # Create job document
            job_doc = {
                "_id": str(uuid.uuid4()),
                "name": job_data.name,
                "domain": job_data.domain,
                "status": "enabled",
                "schedule": job_data.schedule,
                "next_run": next_run,
                "last_run": None,
                "priority": job_data.priority,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            # Insert into database
            await self.collection.insert_one(job_doc)
            
            # Convert to response model
            job_doc["id"] = job_doc.pop("_id")
            job_doc["createdAt"] = job_doc.pop("created_at")
            job_doc["updatedAt"] = job_doc.pop("updated_at")
            job_doc["nextRun"] = job_doc.pop("next_run")
            job_doc["lastRun"] = job_doc.pop("last_run")
            
            logger.info(f"Created scheduled job: {job_data.name} (ID: {job_doc['id']})")
            return ScheduledJobResponse(**job_doc)
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to create scheduled job: {e}")
            raise DatabaseError(f"Failed to create scheduled job: {e}")
    
    async def get_scheduled_jobs(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        domain: Optional[str] = None,
        page: int = 1,
        size: int = 100
    ) -> ScheduledJobListResponse:
        """Get scheduled jobs with optional filtering and pagination."""
        try:
            # Build filter query
            filter_query = {}
            if status:
                filter_query["status"] = status
            if priority:
                filter_query["priority"] = priority
            if domain:
                filter_query["domain"] = domain
            
            # Calculate skip for pagination
            skip = (page - 1) * size
            
            # Get total count
            total = await self.collection.count_documents(filter_query)
            
            # Get jobs with pagination
            cursor = self.collection.find(filter_query).skip(skip).limit(size).sort("next_run", ASCENDING)
            jobs = []
            
            async for doc in cursor:
                # Convert MongoDB document to ScheduledJobResponse
                doc["id"] = str(doc["_id"])
                doc["createdAt"] = doc["created_at"]
                doc["updatedAt"] = doc["updated_at"]
                doc["nextRun"] = doc["next_run"]
                doc["lastRun"] = doc["last_run"]
                
                job = ScheduledJobResponse(**doc)
                jobs.append(job)
            
            return ScheduledJobListResponse(
                scheduled_jobs=jobs,
                count=len(jobs),
                total=total,
                page=page,
                size=size
            )
            
        except Exception as e:
            logger.error(f"Error getting scheduled jobs: {e}")
            raise DatabaseError(f"Failed to get scheduled jobs: {e}")
    
    async def get_scheduled_job_by_id(self, job_id: str) -> Optional[ScheduledJobResponse]:
        """Get a scheduled job by ID."""
        try:
            doc = await self.collection.find_one({"_id": job_id})
            if doc:
                # Convert MongoDB document to ScheduledJobResponse
                doc["id"] = str(doc["_id"])
                doc["createdAt"] = doc["created_at"]
                doc["updatedAt"] = doc["updated_at"]
                doc["nextRun"] = doc["next_run"]
                doc["lastRun"] = doc["last_run"]
                
                return ScheduledJobResponse(**doc)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get scheduled job {job_id}: {e}")
            return None
    
    async def update_scheduled_job(self, job_id: str, job_data: ScheduledJobUpdate) -> Optional[ScheduledJobResponse]:
        """Update a scheduled job."""
        try:
            # Check if job exists
            existing_job = await self.get_scheduled_job_by_id(job_id)
            if not existing_job:
                raise JobNotFoundError(f"Scheduled job not found: {job_id}")
            
            # Validate cron expression if schedule is being updated
            if job_data.schedule:
                try:
                    croniter(job_data.schedule)
                except Exception as e:
                    raise ValueError(f"Invalid cron expression: {e}")
            
            # Prepare update data
            update_data = job_data.dict(exclude_unset=True)
            update_data["updated_at"] = datetime.now(timezone.utc)
            
            # Recalculate next run if schedule changed
            if job_data.schedule:
                cron = croniter(job_data.schedule, datetime.now(timezone.utc))
                update_data["next_run"] = cron.get_next(datetime)
            
            # Update in database
            result = await self.collection.update_one(
                {"_id": job_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                return await self.get_scheduled_job_by_id(job_id)
            return existing_job
            
        except (JobNotFoundError, ValueError):
            raise
        except Exception as e:
            logger.error(f"Failed to update scheduled job {job_id}: {e}")
            raise DatabaseError(f"Failed to update scheduled job: {e}")
    
    async def delete_scheduled_job(self, job_id: str) -> bool:
        """Delete a scheduled job."""
        try:
            result = await self.collection.delete_one({"_id": job_id})
            success = result.deleted_count > 0
            
            if success:
                logger.info(f"Deleted scheduled job: {job_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete scheduled job {job_id}: {e}")
            return False
    
    async def enable_scheduled_job(self, job_id: str) -> bool:
        """Enable a scheduled job."""
        try:
            job = await self.get_scheduled_job_by_id(job_id)
            if not job:
                raise JobNotFoundError(f"Scheduled job not found: {job_id}")
            
            if job.status == "enabled":
                return True  # Already enabled
            
            # Update job status
            update_data = {
                "status": "enabled",
                "updated_at": datetime.now(timezone.utc)
            }
            
            # Recalculate next run time
            cron = croniter(job.schedule, datetime.now(timezone.utc))
            update_data["next_run"] = cron.get_next(datetime)
            
            result = await self.collection.update_one(
                {"_id": job_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.info(f"Enabled scheduled job: {job.name} (ID: {job_id})")
                return True
            
            return False
            
        except JobNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to enable scheduled job {job_id}: {e}")
            return False
    
    async def disable_scheduled_job(self, job_id: str) -> bool:
        """Disable a scheduled job."""
        try:
            job = await self.get_scheduled_job_by_id(job_id)
            if not job:
                raise JobNotFoundError(f"Scheduled job not found: {job_id}")
            
            if job.status == "disabled":
                return True  # Already disabled
            
            # Update job status
            update_data = {
                "status": "disabled",
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = await self.collection.update_one(
                {"_id": job_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.info(f"Disabled scheduled job: {job.name} (ID: {job_id})")
                return True
            
            return False
            
        except JobNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to disable scheduled job {job_id}: {e}")
            return False
    
    async def get_next_runs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get the next scheduled runs."""
        try:
            # Get enabled jobs ordered by next run time
            cursor = self.collection.find(
                {"status": "enabled"}
            ).sort("next_run", ASCENDING).limit(limit)
            
            next_runs = []
            async for doc in cursor:
                next_runs.append({
                    "id": str(doc["_id"]),
                    "name": doc["name"],
                    "domain": doc["domain"],
                    "next_run": doc["next_run"],
                    "schedule": doc["schedule"],
                    "priority": doc["priority"]
                })
            
            return next_runs
            
        except Exception as e:
            logger.error(f"Error getting next runs: {e}")
            return []
    
    async def _scheduler_loop(self):
        """Main scheduler loop that checks for jobs to execute."""
        while self.running:
            try:
                # Get jobs that are due to run
                now = datetime.now(timezone.utc)
                due_jobs = await self.collection.find({
                    "status": "enabled",
                    "next_run": {"$lte": now}
                }).to_list(length=10)
                
                # Execute due jobs
                for job_doc in due_jobs:
                    await self._execute_scheduled_job(job_doc)
                
                # Wait before next check
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _execute_scheduled_job(self, job_doc: Dict[str, Any]):
        """Execute a scheduled job."""
        try:
            job_id = str(job_doc["_id"])
            logger.info(f"Executing scheduled job: {job_doc['name']} (ID: {job_id})")
            
            # Update job status to running
            await self.collection.update_one(
                {"_id": job_id},
                {
                    "$set": {
                        "status": "running",
                        "last_run": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Create a crawl job from the scheduled job
            
            job_create = JobCreate(
                name=f"Scheduled: {job_doc['name']}",
                domain=job_doc["domain"],
                priority=job_doc["priority"],
                scheduled=True
            )
            
            # Create the job
            job = await self.job_service.create_job(job_create)
            
            # Start the job
            await self.job_service.start_job(job.id)
            
            # Calculate next run time
            cron = croniter(job_doc["schedule"], datetime.now(timezone.utc))
            next_run = cron.get_next(datetime)
            
            # Update job status back to enabled and set next run
            await self.collection.update_one(
                {"_id": job_id},
                {
                    "$set": {
                        "status": "enabled",
                        "next_run": next_run,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            logger.info(f"Successfully executed scheduled job: {job_doc['name']} (ID: {job_id})")
            
        except Exception as e:
            logger.error(f"Failed to execute scheduled job {job_doc.get('name', 'Unknown')}: {e}")
            
            # Update job status to failed
            try:
                await self.collection.update_one(
                    {"_id": job_doc["_id"]},
                    {
                        "$set": {
                            "status": "failed",
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
            except Exception as update_error:
                logger.error(f"Failed to update job status to failed: {update_error}")


# Service instance
_scheduler_service: Optional[SchedulerService] = None


async def get_scheduler_service() -> SchedulerService:
    """Get the scheduler service instance."""
    global _scheduler_service
    if _scheduler_service is None:
        database = await get_database()
        _scheduler_service = SchedulerService(database)
        await _scheduler_service.initialize()
    return _scheduler_service


async def close_scheduler_service():
    """Close the scheduler service instance."""
    global _scheduler_service
    if _scheduler_service:
        await _scheduler_service.close()
        _scheduler_service = None 