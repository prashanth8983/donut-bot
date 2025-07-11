#!/usr/bin/env python3
"""
Script to fix timezone issues in existing jobs.
Updates all datetime fields to be timezone-aware.
"""

import asyncio
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def fix_timezone_issues():
    """Fix timezone issues in existing jobs."""
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(settings.mongo_uri)
        db = client[settings.database_name]
        jobs_collection = db.jobs
        scheduled_jobs_collection = db.scheduled_jobs
        
        print("🔧 Fixing timezone issues in existing jobs...")
        
        # Fix jobs collection
        jobs_updated = 0
        async for job in jobs_collection.find({}):
            update_needed = False
            update_data = {}
            
            # Fix start_time
            if job.get('start_time') and job['start_time'].tzinfo is None:
                update_data['start_time'] = job['start_time'].replace(tzinfo=timezone.utc)
                update_needed = True
            
            # Fix end_time
            if job.get('end_time') and job['end_time'].tzinfo is None:
                update_data['end_time'] = job['end_time'].replace(tzinfo=timezone.utc)
                update_needed = True
            
            # Fix created_at
            if job.get('created_at') and job['created_at'].tzinfo is None:
                update_data['created_at'] = job['created_at'].replace(tzinfo=timezone.utc)
                update_needed = True
            
            # Fix updated_at
            if job.get('updated_at') and job['updated_at'].tzinfo is None:
                update_data['updated_at'] = job['updated_at'].replace(tzinfo=timezone.utc)
                update_needed = True
            
            if update_needed:
                await jobs_collection.update_one(
                    {'_id': job['_id']},
                    {'$set': update_data}
                )
                jobs_updated += 1
                print(f"  ✅ Fixed job: {job.get('name', 'Unknown')} (ID: {job['_id']})")
        
        # Fix scheduled_jobs collection
        scheduled_jobs_updated = 0
        async for job in scheduled_jobs_collection.find({}):
            update_needed = False
            update_data = {}
            
            # Fix next_run
            if job.get('next_run') and job['next_run'].tzinfo is None:
                update_data['next_run'] = job['next_run'].replace(tzinfo=timezone.utc)
                update_needed = True
            
            # Fix last_run
            if job.get('last_run') and job['last_run'].tzinfo is None:
                update_data['last_run'] = job['last_run'].replace(tzinfo=timezone.utc)
                update_needed = True
            
            # Fix created_at
            if job.get('created_at') and job['created_at'].tzinfo is None:
                update_data['created_at'] = job['created_at'].replace(tzinfo=timezone.utc)
                update_needed = True
            
            # Fix updated_at
            if job.get('updated_at') and job['updated_at'].tzinfo is None:
                update_data['updated_at'] = job['updated_at'].replace(tzinfo=timezone.utc)
                update_needed = True
            
            if update_needed:
                await scheduled_jobs_collection.update_one(
                    {'_id': job['_id']},
                    {'$set': update_data}
                )
                scheduled_jobs_updated += 1
                print(f"  ✅ Fixed scheduled job: {job.get('name', 'Unknown')} (ID: {job['_id']})")
        
        print(f"🎉 Timezone fix completed!")
        print(f"  - Jobs updated: {jobs_updated}")
        print(f"  - Scheduled jobs updated: {scheduled_jobs_updated}")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error fixing timezone issues: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(fix_timezone_issues()) 