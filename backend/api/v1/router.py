"""
API v1 router.
Main router for all v1 API endpoints.
"""

from fastapi import APIRouter

from .endpoints import crawler, urls, config, metrics, health, scheduler, jobs

# Create main router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(crawler.router, prefix="/crawler", tags=["crawler"])
api_router.include_router(urls.router, prefix="/urls", tags=["urls"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(scheduler.router, prefix="/scheduler", tags=["scheduler"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"]) 