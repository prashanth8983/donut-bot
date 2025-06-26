import asyncio
from services.job_service import JobService
from db.database import database

async def test_jobs():
    # Connect to database first
    await database.connect()
    
    service = JobService(database)
    jobs = await service.get_jobs()
    print(f'Total jobs: {jobs.total}')
    
    for job in jobs.jobs[:5]:
        print(f'Job: {job.name} - Status: {job.status} - Progress: {job.progress}% - Pages: {job.pages_found} - Errors: {job.errors}')
    
    # Close database connection
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(test_jobs()) 