#!/usr/bin/env python3
"""
Script to delete all jobs and scheduled jobs from the MongoDB database.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def delete_all_jobs():
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.database_name]
    jobs_collection = db.jobs
    scheduled_jobs_collection = db.scheduled_jobs

    jobs_deleted = await jobs_collection.delete_many({})
    scheduled_jobs_deleted = await scheduled_jobs_collection.delete_many({})

    print(f"Deleted {jobs_deleted.deleted_count} jobs.")
    print(f"Deleted {scheduled_jobs_deleted.deleted_count} scheduled jobs.")
    client.close()

if __name__ == "__main__":
    asyncio.run(delete_all_jobs()) 