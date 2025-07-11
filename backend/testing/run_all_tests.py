#!/usr/bin/env python3
"""
Test runner script for all Donut-Bot tests.
This script runs all tests in the testing folder in a logical order.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def run_test(test_path, description):
    """Run a single test and return success status."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Script: {test_path}")
    print(f"{'='*60}")
    
    try:
        # Set environment variables for testing
        env = os.environ.copy()
        env["MONGO_URI"] = "mongodb://localhost:27017/test"
        env["SECRET_KEY"] = "test-secret-key-for-testing-only"
        
        result = subprocess.run(
            [sys.executable, test_path],
            env=env,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode == 0:
            print("✅ Test PASSED")
            if result.stdout:
                print("Output:")
                print(result.stdout)
            return True
        else:
            print("❌ Test FAILED")
            if result.stdout:
                print("Output:")
                print(result.stdout)
            if result.stderr:
                print("Error:")
                print(result.stderr)
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Test TIMEOUT (5 minutes)")
        return False
    except Exception as e:
        print(f"❌ Test ERROR: {e}")
        return False

def main():
    """Run all tests in order."""
    print("🚀 Donut-Bot Test Suite")
    print("Running all tests in the testing folder...")
    
    # Define test order and descriptions
    tests = [
        ("api_tests/test_api_endpoints.py", "API Endpoint Tests"),
        ("integration_tests/test_integration.py", "Integration Tests"),
        ("integration_tests/test_pause_resume.py", "Pause/Resume Tests"),
        ("frontend_tests/test_api.py", "Frontend API Tests"),
    ]
    
    # Get the testing directory
    testing_dir = Path(__file__).parent
    
    # Run tests
    passed = 0
    total = len(tests)
    
    for test_file, description in tests:
        test_path = testing_dir / test_file
        
        if test_path.exists():
            if run_test(str(test_path), description):
                passed += 1
        else:
            print(f"⚠️  Test file not found: {test_path}")
    
    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed. Check the output above.")
        return 1

def run_utility_scripts():
    """Run utility scripts (separate function for safety)."""
    print("\n🔧 Utility Scripts")
    print("These scripts modify data - run with caution!")
    
    utilities = [
        ("utility_scripts/fix_timezone_issues.py", "Fix Timezone Issues"),
        ("utility_scripts/delete_all_jobs.py", "Delete All Jobs (DANGEROUS)"),
    ]
    
    testing_dir = Path(__file__).parent
    
    for util_file, description in utilities:
        util_path = testing_dir / util_file
        
        if util_path.exists():
            print(f"\n{description}: {util_path}")
            response = input("Run this utility script? (y/N): ").strip().lower()
            
            if response == 'y':
                run_test(str(util_path), description)
            else:
                print("Skipped.")
        else:
            print(f"⚠️  Utility script not found: {util_path}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--utilities":
        run_utility_scripts()
    else:
        sys.exit(main()) 