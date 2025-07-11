#!/usr/bin/env python3
"""
Simple test script to debug job service database connection.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set environment variables
os.environ["MONGO_URI"] = "mongodb://localhost:27017/donutbot"
os.environ["REDIS_HOST"] = "localhost"
os.environ["REDIS_PORT"] = "6379"
os.environ["LOCAL_OUTPUT_DIR"] = "./crawler_output"

async def test_job_service():
    """Test job service database connection."""
    try:
        from db.mongodb import mongodb_client
        from services.job_service import JobService
        from db.database import Database
        
        print("1. Connecting to MongoDB...")
        await mongodb_client.connect()
        print(f"   MongoDB connected: client={mongodb_client.client}, db={mongodb_client.db}")
        
        print("2. Creating Database wrapper...")
        class DatabaseWrapper(Database):
            def __init__(self, client, db):
                self.client = client
                self.database = db
            
            def get_collection(self, collection_name: str):
                if self.database is None:
                    raise Exception("Database not connected")
                return self.database[collection_name]
        
        db = DatabaseWrapper(mongodb_client.client, mongodb_client.db)
        print(f"   Database wrapper created: client={db.client}, database={db.database}")
        
        print("3. Creating JobService...")
        job_service = JobService(db)
        print(f"   JobService created: collection={job_service.collection}")
        
        print("4. Testing collection access...")
        collection = db.get_collection("jobs")
        print(f"   Collection accessed: {collection}")
        
        print("5. Testing job service methods...")
        jobs = await job_service.get_jobs()
        print(f"   Jobs retrieved: {jobs.total} jobs")
        
        print("✅ All tests passed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if 'mongodb_client' in locals():
            await mongodb_client.close()

if __name__ == "__main__":
    asyncio.run(test_job_service()) 