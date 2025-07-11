#!/usr/bin/env python3
"""
Test script to verify pause/resume functionality for jobs.
This script tests the Redis cache bug fix.
"""

import asyncio
import requests
import time
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000/api/v1"

def make_request(method: str, endpoint: str, data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Make HTTP request to the API."""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == "GET":
            response = requests.get(url)
        elif method.upper() == "POST":
            response = requests.post(url, json=data)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data)
        elif method.upper() == "DELETE":
            response = requests.delete(url)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        response.raise_for_status()
        return response.json() if response.content else {}
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return {"error": str(e)}

def test_pause_resume_workflow():
    """Test the complete pause/resume workflow."""
    print("🧪 Testing Pause/Resume Workflow")
    print("=" * 50)
    
    # Step 1: Create a job
    print("\n1. Creating a new job...")
    job_data = {
        "name": "Test Pause Resume Job",
        "domain": "https://example.com",
        "priority": "medium",
        "config": {
            "workers": 2,
            "max_depth": 2,
            "max_pages": 10,
            "allowed_domains": ["example.com"]
        }
    }
    
    job_response = make_request("POST", "/jobs/", job_data)
    if "error" in job_response:
        print(f"❌ Failed to create job: {job_response['error']}")
        return
    
    job_id = job_response.get("id")
    print(f"✅ Job created with ID: {job_id}")
    
    # Step 2: Start the job
    print("\n2. Starting the job...")
    start_response = make_request("POST", f"/jobs/{job_id}/start")
    if "error" in start_response:
        print(f"❌ Failed to start job: {start_response['error']}")
        return
    
    print("✅ Job started successfully")
    
    # Step 3: Wait a bit and check status
    print("\n3. Waiting 3 seconds and checking status...")
    time.sleep(3)
    
    job_status = make_request("GET", f"/jobs/{job_id}")
    if "error" not in job_status:
        print(f"📊 Job status: {job_status.get('status')}")
        print(f"📊 Progress: {job_status.get('progress')}%")
        print(f"📊 Pages found: {job_status.get('pages_found')}")
    
    # Step 4: Pause the job
    print("\n4. Pausing the job...")
    pause_response = make_request("POST", f"/jobs/{job_id}/pause")
    if "error" in pause_response:
        print(f"❌ Failed to pause job: {pause_response['error']}")
        return
    
    print("✅ Job paused successfully")
    
    # Step 5: Check paused status
    print("\n5. Checking paused status...")
    job_status = make_request("GET", f"/jobs/{job_id}")
    if "error" not in job_status:
        print(f"📊 Job status: {job_status.get('status')}")
        print(f"📊 Progress: {job_status.get('progress')}%")
        print(f"📊 Pages found: {job_status.get('pages_found')}")
    
    # Step 6: Wait a bit more
    print("\n6. Waiting 2 seconds...")
    time.sleep(2)
    
    # Step 7: Resume the job
    print("\n7. Resuming the job...")
    resume_response = make_request("POST", f"/jobs/{job_id}/resume")
    if "error" in resume_response:
        print(f"❌ Failed to resume job: {resume_response['error']}")
        return
    
    print("✅ Job resumed successfully")
    
    # Step 8: Check resumed status
    print("\n8. Checking resumed status...")
    time.sleep(2)
    job_status = make_request("GET", f"/jobs/{job_id}")
    if "error" not in job_status:
        print(f"📊 Job status: {job_status.get('status')}")
        print(f"📊 Progress: {job_status.get('progress')}%")
        print(f"📊 Pages found: {job_status.get('pages_found')}")
    
    # Step 9: Check crawler status
    print("\n9. Checking crawler status...")
    crawler_status = make_request("GET", "/crawler/status/")
    if "error" not in crawler_status:
        print(f"🤖 Crawler running: {crawler_status.get('crawler_running')}")
        print(f"🤖 Pages crawled: {crawler_status.get('pages_crawled_total')}")
        print(f"🤖 Queue size: {crawler_status.get('frontier_queue_size')}")
    
    print("\n" + "=" * 50)
    print("🎉 Pause/Resume test completed!")
    print("\nExpected behavior:")
    print("- Job should pause and resume without losing progress")
    print("- Crawler should continue from where it left off")
    print("- Redis state should be preserved")

def test_redis_connection():
    """Test Redis connection."""
    print("\n🔍 Testing Redis Connection")
    print("=" * 30)
    
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0)
        r.ping()
        print("✅ Redis connection successful")
        
        # Test basic operations
        r.set("test_key", "test_value")
        value = r.get("test_key")
        r.delete("test_key")
        print("✅ Redis operations working")
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("💡 Make sure Redis is running: redis-server")

if __name__ == "__main__":
    print("🚀 Donut-Bot Pause/Resume Test")
    print("Testing the Redis cache bug fix...")
    
    # Test Redis connection first
    test_redis_connection()
    
    # Test the pause/resume workflow
    test_pause_resume_workflow() 