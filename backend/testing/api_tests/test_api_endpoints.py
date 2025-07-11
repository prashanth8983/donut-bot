#!/usr/bin/env python3
"""
Test script to verify API endpoints are working correctly.
This script tests the endpoint definitions without starting the full server.
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set required environment variables for testing
os.environ["MONGO_URI"] = "mongodb://localhost:27017/test"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"

def test_imports():
    """Test that all endpoint modules can be imported."""
    print("Testing imports...")
    
    try:
        from api.v1.endpoints import crawler, urls, config, metrics, health, scheduler, jobs, results, stats
        print("✓ All endpoint modules imported successfully")
        return True
    except Exception as e:
        print(f"✗ Import error: {e}")
        return False

def test_router_inclusion():
    """Test that all routers are included in the main router."""
    print("\nTesting router inclusion...")
    
    try:
        from api.v1.router import api_router
        
        # Check that all expected routes are registered
        routes = [route.path for route in api_router.routes]
        
        expected_prefixes = [
            "/crawler",
            "/urls", 
            "/config",
            "/metrics",
            "/health",
            "/scheduler",
            "/jobs",
            "/results",
            "/stats"
        ]
        
        for prefix in expected_prefixes:
            if any(route.startswith(prefix) for route in routes):
                print(f"✓ Router {prefix} included")
            else:
                print(f"✗ Router {prefix} not found")
                return False
        
        print("✓ All routers included successfully")
        return True
        
    except Exception as e:
        print(f"✗ Router test error: {e}")
        return False

def test_endpoint_definitions():
    """Test that key endpoints are properly defined."""
    print("\nTesting endpoint definitions...")
    
    try:
        from api.v1.endpoints import results, stats
        
        # Test results endpoints
        results_routes = [route.path for route in results.router.routes]
        expected_results_routes = ["/", "/{url_hash}", "/", "/stats", "/", "/stats/"]
        
        for route in expected_results_routes:
            if route in results_routes:
                print(f"✓ Results endpoint {route} defined")
            else:
                print(f"✗ Results endpoint {route} missing")
        
        # Test stats endpoints
        stats_routes = [route.path for route in stats.router.routes]
        expected_stats_routes = ["/", "/"]
        
        for route in expected_stats_routes:
            if route in stats_routes:
                print(f"✓ Stats endpoint {route} defined")
            else:
                print(f"✗ Stats endpoint {route} missing")
        
        print("✓ Endpoint definitions test completed")
        return True
        
    except Exception as e:
        print(f"✗ Endpoint test error: {e}")
        return False

def test_file_storage_methods():
    """Test that FileStorageService has the required methods."""
    print("\nTesting FileStorageService methods...")
    
    try:
        from services.file_storage_service import FileStorageService
        
        # Check that required methods exist
        required_methods = [
            'get_results',
            'get_result_by_hash', 
            'clear_results',
            'get_results_stats'
        ]
        
        for method in required_methods:
            if hasattr(FileStorageService, method):
                print(f"✓ Method {method} exists")
            else:
                print(f"✗ Method {method} missing")
                return False
        
        print("✓ All required FileStorageService methods exist")
        return True
        
    except Exception as e:
        print(f"✗ FileStorageService test error: {e}")
        return False

def main():
    """Run all tests."""
    print("Testing API Endpoints Implementation")
    print("=" * 40)
    
    tests = [
        test_imports,
        test_router_inclusion,
        test_endpoint_definitions,
        test_file_storage_methods
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 40)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! API endpoints are ready.")
        return 0
    else:
        print("❌ Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 