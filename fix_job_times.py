#!/usr/bin/env python3
"""
Script to fix existing jobs in the database by clearing end_time for running jobs.
"""

import asyncio
import motor.motor_asyncio
from datetime import datetime, timezone
from bson import ObjectId

async def fix_job_times():
    """Fix existing jobs by clearing end_time for running jobs."""
    
    # Connect to MongoDB
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://admin:password123@localhost:27017/webcrawler?authSource=admin")
    db = client.webcrawler
    collection = db.jobs
    
    print("Connected to MongoDB")
    
    # Find all running jobs that have an end_time
    query = {
        "status": "running",
        "end_time": {"$ne": None}
    }
    
    cursor = collection.find(query)
    count = 0
    
    async for doc in cursor:
        job_id = doc["_id"]
        job_name = doc.get("name", "Unknown")
        old_end_time = doc.get("end_time")
        start_time = doc.get("start_time")
        
        print(f"Fixing job: {job_name} (ID: {job_id})")
        print(f"  - Status: {doc.get('status')}")
        print(f"  - Start time: {start_time}")
        print(f"  - Old end time: {old_end_time}")
        
        # Clear end_time for running jobs
        result = await collection.update_one(
            {"_id": job_id},
            {"$unset": {"end_time": ""}}
        )
        
        if result.modified_count > 0:
            print(f"  ✓ Fixed: cleared end_time")
            count += 1
        else:
            print(f"  ✗ Failed to update")
        
        print()
    
    print(f"Fixed {count} running jobs")
    
    # Also check for jobs with end_time earlier than start_time
    pipeline = [
        {
            "$match": {
                "start_time": {"$exists": True, "$ne": None},
                "end_time": {"$exists": True, "$ne": None}
            }
        },
        {
            "$addFields": {
                "time_diff": {
                    "$subtract": ["$end_time", "$start_time"]
                }
            }
        },
        {
            "$match": {
                "time_diff": {"$lt": 0}
            }
        }
    ]
    
    print("\nChecking for jobs with end_time earlier than start_time...")
    async for doc in collection.aggregate(pipeline):
        job_id = doc["_id"]
        job_name = doc.get("name", "Unknown")
        start_time = doc.get("start_time")
        end_time = doc.get("end_time")
        time_diff = doc.get("time_diff")
        
        print(f"Found job with invalid times: {job_name} (ID: {job_id})")
        print(f"  - Start time: {start_time}")
        print(f"  - End time: {end_time}")
        print(f"  - Difference: {time_diff} seconds")
        
        # Clear end_time for these jobs too
        result = await collection.update_one(
            {"_id": job_id},
            {"$unset": {"end_time": ""}}
        )
        
        if result.modified_count > 0:
            print(f"  ✓ Fixed: cleared end_time")
            count += 1
        else:
            print(f"  ✗ Failed to update")
        
        print()
    
    print(f"Total jobs fixed: {count}")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_job_times()) 