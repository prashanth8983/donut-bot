"""
API dependencies for FastAPI.
Provides dependency injection for services and database connections.
"""

from typing import Generator
from fastapi import Depends

from db.database import Database, get_database
from services.job_service import JobService
from services.crawler_service import crawler_service


async def get_job_service(db: Database = Depends(get_database)):
    """Dependency to get job service instance."""
    try:
        # Check if database is actually connected
        if not db.client:
            raise Exception("Database not connected")
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
            async def stop_job(self, job_id: str):
                return False
            async def resume_job(self, job_id: str):
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