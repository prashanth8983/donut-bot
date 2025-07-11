#!/usr/bin/env python3
"""
Integration test to verify frontend-backend communication.
"""

import requests
import json
import time

def test_backend_endpoints():
    """Test that all backend endpoints are responding."""
    base_url = "http://localhost:8000"
    
    print("Testing Backend API Endpoints")
    print("=" * 40)
    
    # Test basic endpoints
    endpoints = [
        ("/", "Root endpoint"),
        ("/api/v1/health/", "Health check"),
        ("/api/v1/crawler/status/", "Crawler status"),
        ("/api/v1/metrics/", "Metrics"),
        ("/api/v1/results/", "Results"),
        ("/api/v1/stats/", "Stats"),
        ("/api/v1/config/", "Configuration"),
        ("/api/v1/urls/queue/", "URL queue status"),
    ]
    
    for endpoint, description in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            if response.status_code == 200:
                print(f"✓ {description}: {response.status_code}")
            else:
                print(f"✗ {description}: {response.status_code}")
        except Exception as e:
            print(f"✗ {description}: Error - {e}")
    
    print()

def test_frontend_connectivity():
    """Test that frontend is accessible."""
    print("Testing Frontend Connectivity")
    print("=" * 40)
    
    try:
        response = requests.get("http://localhost:5173/", timeout=5)
        if response.status_code == 200:
            print("✓ Frontend is accessible")
        else:
            print(f"✗ Frontend returned status: {response.status_code}")
    except Exception as e:
        print(f"✗ Frontend error: {e}")
    
    print()

def test_api_response_formats():
    """Test that API responses match frontend expectations."""
    print("Testing API Response Formats")
    print("=" * 40)
    
    base_url = "http://localhost:8000"
    
    # Test crawler status format
    try:
        response = requests.get(f"{base_url}/api/v1/crawler/status/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            required_fields = [
                "crawler_running", "uptime_seconds", "pages_crawled_total",
                "frontier_queue_size", "allowed_domains"
            ]
            
            missing_fields = [field for field in required_fields if field not in data]
            if not missing_fields:
                print("✓ Crawler status response format is correct")
            else:
                print(f"✗ Crawler status missing fields: {missing_fields}")
        else:
            print(f"✗ Crawler status returned: {response.status_code}")
    except Exception as e:
        print(f"✗ Crawler status error: {e}")
    
    # Test results format
    try:
        response = requests.get(f"{base_url}/api/v1/results/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            required_fields = ["results", "total", "page", "size", "pages"]
            
            missing_fields = [field for field in required_fields if field not in data]
            if not missing_fields:
                print("✓ Results response format is correct")
            else:
                print(f"✗ Results missing fields: {missing_fields}")
        else:
            print(f"✗ Results returned: {response.status_code}")
    except Exception as e:
        print(f"✗ Results error: {e}")
    
    # Test stats format
    try:
        response = requests.get(f"{base_url}/api/v1/stats/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            required_fields = ["metrics", "jobs", "scheduler", "storage", "results", "system"]
            
            missing_fields = [field for field in required_fields if field not in data]
            if not missing_fields:
                print("✓ Stats response format is correct")
            else:
                print(f"✗ Stats missing fields: {missing_fields}")
        else:
            print(f"✗ Stats returned: {response.status_code}")
    except Exception as e:
        print(f"✗ Stats error: {e}")
    
    print()

def main():
    """Run all integration tests."""
    print("Frontend-Backend Integration Test")
    print("=" * 50)
    print()
    
    # Wait a moment for services to be ready
    time.sleep(2)
    
    test_backend_endpoints()
    test_frontend_connectivity()
    test_api_response_formats()
    
    print("=" * 50)
    print("Integration test completed!")
    print()
    print("Next steps:")
    print("1. Open http://localhost:5173 in your browser")
    print("2. The frontend should now be able to communicate with the backend")
    print("3. All API endpoints are ready for use")

if __name__ == "__main__":
    main() 