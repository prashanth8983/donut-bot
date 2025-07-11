# Integration Tests and Utility Scripts

This folder contains integration tests, manual testing scripts, and utility scripts for the Donut-Bot project.

**Note**: This is separate from the `tests/` folder, which contains proper unit tests using pytest. This `testing/` folder is for integration tests, manual testing, and utility scripts that don't fit the unit test paradigm.

## Directory Structure

```
testing/
├── api_tests/           # Backend API endpoint tests
├── integration_tests/   # Full system integration tests
├── utility_scripts/     # Database and system utility scripts
├── frontend_tests/      # Frontend API testing scripts
└── README.md           # This file
```

## API Tests (`api_tests/`)

### `test_api_endpoints.py`
- **Purpose**: Tests that all API endpoint modules can be imported and routers are properly configured
- **Usage**: `python testing/api_tests/test_api_endpoints.py`
- **What it tests**:
  - Import validation for all endpoint modules
  - Router inclusion in the main API router
  - Endpoint definition validation
  - FileStorageService method existence

## Integration Tests (`integration_tests/`)

### `test_integration.py`
- **Purpose**: Tests frontend-backend communication and API response formats
- **Usage**: `python testing/integration_tests/test_integration.py`
- **What it tests**:
  - Backend API endpoint availability
  - Frontend connectivity
  - API response format validation
  - Integration between frontend and backend services

### `test_pause_resume.py`
- **Purpose**: Tests pause/resume functionality for jobs and Redis cache integration
- **Usage**: `python testing/integration_tests/test_pause_resume.py`
- **What it tests**:
  - Complete pause/resume workflow
  - Redis connection and operations
  - Job state preservation during pause/resume
  - Crawler status during operations

## Utility Scripts (`utility_scripts/`)

### `delete_all_jobs.py`
- **Purpose**: Deletes all jobs and scheduled jobs from the MongoDB database
- **Usage**: `python testing/utility_scripts/delete_all_jobs.py`
- **Warning**: This will permanently delete all job data
- **Use case**: Clean slate for testing or development

### `fix_timezone_issues.py`
- **Purpose**: Fixes timezone issues in existing jobs by updating naive datetime fields to timezone-aware
- **Usage**: `python testing/utility_scripts/fix_timezone_issues.py`
- **What it fixes**:
  - `start_time`, `end_time`, `created_at`, `updated_at` in jobs collection
  - `next_run`, `last_run`, `created_at`, `updated_at` in scheduled_jobs collection
- **Use case**: Migration script for existing data with timezone issues

## Frontend Tests (`frontend_tests/`)

### `test_api.py`
- **Purpose**: Comprehensive API testing script for all backend endpoints
- **Usage**: `python testing/frontend_tests/test_api.py`
- **What it tests**:
  - All CRUD operations for jobs and scheduled jobs
  - Crawler management endpoints
  - Configuration management
  - URL queue management
  - Results and metrics endpoints
  - Health checks

## Running Tests

### Prerequisites
1. Ensure the backend server is running: `python main.py`
2. Ensure MongoDB is running and accessible
3. Ensure Redis is running (for pause/resume tests)
4. Ensure the frontend is running (for integration tests)

### Running All Tests
```bash
# From the backend directory
cd backend

# Run API tests
python testing/api_tests/test_api_endpoints.py

# Run integration tests
python testing/integration_tests/test_integration.py
python testing/integration_tests/test_pause_resume.py

# Run frontend API tests
python testing/frontend_tests/test_api.py

# Run utility scripts (if needed)
python testing/utility_scripts/delete_all_jobs.py
python testing/utility_scripts/fix_timezone_issues.py
```

### Running Tests with Docker
```bash
# If using Docker Compose
docker-compose exec backend python testing/api_tests/test_api_endpoints.py
docker-compose exec backend python testing/integration_tests/test_integration.py
```

## Notes

- All test scripts are designed to be run independently
- Utility scripts should be used with caution, especially `delete_all_jobs.py`
- Integration tests require both frontend and backend to be running
- Some tests may require specific environment variables or configuration
- Test scripts include proper error handling and informative output

## Adding New Tests

When adding new test scripts:

1. Place them in the appropriate subdirectory based on their purpose
2. Update this README with documentation
3. Ensure the script has proper error handling
4. Include usage instructions in the script header
5. Test the script thoroughly before committing 