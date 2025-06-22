"""
API dependencies for FastAPI.
Provides dependency injection for services and database connections.
"""

from typing import Generator
from fastapi import Depends

from ..db.database import Database, get_database
from ..services.job_service import JobService


async def get_job_service(db: Database = Depends(get_database)) -> JobService:
    """Dependency to get job service instance."""
    return JobService(db) 