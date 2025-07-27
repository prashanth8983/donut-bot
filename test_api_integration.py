#!/usr/bin/env python3
"""
Test script to verify API integration between frontend and backend.
This script tests the key endpoints that the frontend uses.
"""

import requests
import json
import time
from typing import Dict, Any

BASE_URL = "http://localhost:8000/api/v1"

def test_endpoint(method: str, endpoint: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Test an API endpoint and return the response."""
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
            return {"error": f"Unsupported method: {method}"}
        
        response.raise_for_status()
        return {
            "success": True,
            "status_code": response.status_code,
            "data": response.json() if response.content else {}
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": str(e),
            "status_code": getattr(e.response, 'status_code', None) if hasattr(e, 'response') else None
        }

def main():
    """Run all API integration tests."""
    print("🧪 Testing API Integration")
    print("=" * 50)
    
    # Test 1: Health Check
    print("\n1. Testing Health Check...")
    health_result = test_endpoint("GET", "/health/")
    if health_result["success"]:
        print("✅ Health check passed")
        print(f"   Status: {health_result['data']}")
    else:
        print(f"❌ Health check failed: {health_result['error']}")
        return
    
    # Test 2: Crawler Status
    print("\n2. Testing Crawler Status...")
    status_result = test_endpoint("GET", "/crawler/status/")
    if status_result["success"]:
        print("✅ Crawler status endpoint working")
        print(f"   Crawler running: {status_result['data'].get('crawler_running', 'N/A')}")
    else:
        print(f"❌ Crawler status failed: {status_result['error']}")
    
    # Test 3: Configuration
    print("\n3. Testing Configuration...")
    config_result = test_endpoint("GET", "/config/")
    if config_result["success"]:
        print("✅ Configuration endpoint working")
        print(f"   Workers: {config_result['data'].get('workers', 'N/A')}")
    else:
        print(f"❌ Configuration failed: {config_result['error']}")
    
    # Test 4: Metrics
    print("\n4. Testing Metrics...")
    metrics_result = test_endpoint("GET", "/metrics/?time_range=24h")
    if metrics_result["success"]:
        print("✅ Metrics endpoint working")
        print(f"   Pages crawled: {metrics_result['data'].get('pages_crawled', 'N/A')}")
    else:
        print(f"❌ Metrics failed: {metrics_result['error']}")
    
    # Test 5: Jobs
    print("\n5. Testing Jobs...")
    jobs_result = test_endpoint("GET", "/jobs/")
    if jobs_result["success"]:
        print("✅ Jobs endpoint working")
        print(f"   Job count: {jobs_result['data'].get('count', 'N/A')}")
    else:
        print(f"❌ Jobs failed: {jobs_result['error']}")
    
    # Test 6: Queue Status
    print("\n6. Testing Queue Status...")
    queue_result = test_endpoint("GET", "/urls/queue/")
    if queue_result["success"]:
        print("✅ Queue status endpoint working")
        print(f"   Queue size: {queue_result['data'].get('queue_size', 'N/A')}")
    else:
        print(f"❌ Queue status failed: {queue_result['error']}")
    
    # Test 7: Stats
    print("\n7. Testing Stats...")
    stats_result = test_endpoint("GET", "/stats/")
    if stats_result["success"]:
        print("✅ Stats endpoint working")
        print(f"   Stats available: {bool(stats_result['data'])}")
    else:
        print(f"❌ Stats failed: {stats_result['error']}")
    
    # Test 8: Results
    print("\n8. Testing Results...")
    results_result = test_endpoint("GET", "/results/")
    if results_result["success"]:
        print("✅ Results endpoint working")
        print(f"   Results count: {results_result['data'].get('total', 'N/A')}")
    else:
        print(f"❌ Results failed: {results_result['error']}")
    
    # Test 9: Scheduler
    print("\n9. Testing Scheduler...")
    scheduler_result = test_endpoint("GET", "/scheduler/jobs")
    if scheduler_result["success"]:
        print("✅ Scheduler endpoint working")
        print(f"   Scheduled jobs: {scheduler_result['data'].get('count', 'N/A')}")
    else:
        print(f"❌ Scheduler failed: {scheduler_result['error']}")
    
    print("\n" + "=" * 50)
    print("🎉 API Integration Test Complete!")
    print("\nFrontend should now be able to communicate with the backend.")
    print("Check the frontend at: http://localhost:5173")

if __name__ == "__main__":
    main() 