"""
API dependencies for FastAPI.
Provides dependency injection for services and database connections.
"""

from typing import Generator
from fastapi import Depends

from db.mongodb import mongodb_client
from db.database import Database
from services.job_service import JobService
from services.crawler_service import crawler_service


async def get_job_service():
    """Dependency to get job service instance."""
    try:
        # Check if database is actually connected
        if mongodb_client.client is None:
            raise Exception("Database not connected")
        
        # Create a Database instance that wraps the mongodb_client
        class DatabaseWrapper(Database):
            def __init__(self, client, db):
                self.client = client
                self.database = db
            
            def get_collection(self, collection_name: str):
                if self.database is None:
                    raise Exception("Database not connected")
                return self.database[collection_name]
        
        db = DatabaseWrapper(mongodb_client.client, mongodb_client.db)
        return JobService(db)
    except Exception as e:
        from core.logger import get_logger
        logger = get_logger("deps")
        logger.warning(f"Job service initialization failed: {e}")
        # Return a mock service that returns empty results
        class MockJobService:
            async def get_jobs(self, **kwargs):
                from db.schemas import JobListResponse
                return JobListResponse(jobs=[], count=0, total=0, page=1, size=100)
            async def get_job_by_id(self, job_id: str):
                return None
            async def create_job(self, job_data):
                raise Exception("Database not available")
            async def update_job(self, job_id: str, job_data):
                raise Exception("Database not available")
            async def delete_job(self, job_id: str):
                return False
            async def start_job(self, job_id: str):
                return False
            async def resume_job(self, job_id: str):
                return False
            async def pause_job(self, job_id: str):
                return False
            async def get_job_stats(self):
                from db.schemas import JobStats
                return JobStats()
        return MockJobService()


async def get_crawler_service():
    """Dependency to get crawler service instance."""
    return crawler_service


async def get_scheduler_service():
    """Dependency to get scheduler service instance."""
    try:
        from services.scheduler_service import get_scheduler_service as get_sched_service
        return await get_sched_service()
    except Exception as e:
        from core.logger import get_logger
        logger = get_logger("deps")
        logger.warning(f"Scheduler service initialization failed: {e}")
        # Return a mock service that returns empty results
        class MockSchedulerService:
            async def get_scheduled_jobs(self, **kwargs):
                from db.schemas import ScheduledJobListResponse
                return ScheduledJobListResponse(scheduled_jobs=[], count=0, total=0, page=1, size=100)
            async def get_scheduled_job_by_id(self, job_id: str):
                return None
            async def create_scheduled_job(self, job_data):
                raise Exception("Database not available")
            async def update_scheduled_job(self, job_id: str, job_data):
                raise Exception("Database not available")
            async def delete_scheduled_job(self, job_id: str):
                return False
            async def enable_scheduled_job(self, job_id: str):
                return False
            async def disable_scheduled_job(self, job_id: str):
                return False
            async def get_next_runs(self, limit: int = 10):
                return []
        return MockSchedulerService() 