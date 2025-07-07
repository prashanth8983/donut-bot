# Mock API Data

This directory contains comprehensive mock data for all backend APIs to facilitate development and testing without requiring a running backend server.

## Overview

The mock data system provides realistic data for all API endpoints including:
- Crawler status and metrics
- Job management
- Queue status
- Configuration management
- Scheduled jobs
- Health checks
- And more...

## Files

### `mockApiData.ts`
Contains all mock data structures and API responses:
- **Mock Data Objects**: Individual data structures for each entity type
- **Mock API Responses**: Complete API response objects with success/error states
- **Mock API Service**: A service that simulates the real API with configurable delays

### `apiMode.ts` (in `../utils/`)
Configuration utility for switching between mock and real APIs.

## Usage

### Basic Usage

```typescript
import { mockCrawlerStatus, mockJobs, getMockMetrics } from './mockApiData';

// Use individual mock data
const status = mockCrawlerStatus;
const jobs = mockJobs;
const metrics = getMockMetrics('24h');
```

### Using Mock API Service

```typescript
import { createMockApiService } from './mockApiData';

const mockApi = createMockApiService(300); // 300ms delay

// Use like real API
const status = await mockApi.getCrawlerStatus();
const jobs = await mockApi.getJobs();
const metrics = await mockApi.getMetrics('24h');
```

### Switching Between Mock and Real APIs

```typescript
import { getApiService, isMockMode } from '../utils/apiMode';

// Get appropriate service based on configuration
const apiService = await getApiService();

// Check current mode
if (isMockMode()) {
  console.log('Using mock data');
} else {
  console.log('Using real API');
}
```

## Configuration

### API Mode

Set the API mode in `../utils/apiMode.ts`:

```typescript
// Development mode (defaults to mock)
export const API_MODE = 'mock';

// Production mode (defaults to real)
export const API_MODE = 'real';

// Force specific mode
export const API_MODE = 'mock'; // Always use mock
```

### Environment Variables

```bash
# API Base URL (for real mode)
VITE_API_BASE_URL=http://localhost:8089/api/v1

# Force API mode
VITE_API_MODE=mock
```

## Mock Data Structure

### Crawler Status
```typescript
{
  crawler_running: true,
  uptime_seconds: 12456.78,
  pages_crawled_total: 1234567,
  avg_pages_per_second: 15.8,
  // ... more fields
}
```

### Jobs
```typescript
[
  {
    id: 'job-001',
    name: 'Northeastern University Crawl',
    domain: 'northeastern.edu',
    status: 'running',
    progress: 67.5,
    // ... more fields
  }
]
```

### Metrics
```typescript
{
  pages_crawled: 1234567,
  errors: 4021,
  pages_crawled_over_time: [/* time series data */],
  content_type_counts: { /* content type distribution */ },
  status_code_counts: { /* HTTP status codes */ }
}
```

## Customizing Mock Data

### Adding New Mock Jobs

```typescript
export const mockJobs: CrawlJob[] = [
  // ... existing jobs
  {
    id: 'job-006',
    name: 'New University Crawl',
    domain: 'newuniversity.edu',
    status: 'queued',
    // ... other fields
  }
];
```

### Modifying Metrics

```typescript
export const getMockMetrics = (timeRange: '24h' | '7d' | 'all'): Metrics => {
  const { pages_crawled_over_time, errors_over_time } = generateRandomData(timeRange);
  
  return {
    pages_crawled: 2000000, // Customize this
    errors: 1000, // Customize this
    // ... other fields
  };
};
```

### Customizing API Responses

```typescript
export const mockApiResponses = {
  // ... existing responses
  customResponse: {
    success: true,
    data: {
      // Your custom data
    }
  }
};
```

## Testing

### Unit Tests

```typescript
import { mockCrawlerStatus, mockJobs } from './mockApiData';

describe('Dashboard Component', () => {
  it('should display crawler status', () => {
    // Use mock data in tests
    expect(mockCrawlerStatus.crawler_running).toBe(true);
  });
});
```

### Integration Tests

```typescript
import { createMockApiService } from './mockApiData';

describe('API Integration', () => {
  it('should fetch jobs', async () => {
    const mockApi = createMockApiService(0); // No delay for tests
    const response = await mockApi.getJobs();
    expect(response.success).toBe(true);
    expect(response.data.jobs).toHaveLength(5);
  });
});
```

## Benefits

1. **Development Speed**: No need to run backend server during frontend development
2. **Consistent Data**: Predictable data for UI development and testing
3. **Offline Development**: Work without network connectivity
4. **Testing**: Reliable test data for unit and integration tests
5. **Demo**: Present features with realistic data

## Switching to Real API

When ready to use the real backend:

1. Set `API_MODE = 'real'` in `apiMode.ts`
2. Ensure backend server is running
3. Verify `VITE_API_BASE_URL` is correct
4. Test API connectivity

## Troubleshooting

### Mock Data Not Loading
- Check `API_MODE` configuration
- Verify import paths
- Check console for mode logging

### API Errors
- Ensure backend server is running (real mode)
- Check network connectivity
- Verify API endpoints match backend

### Build Issues
- Mock data is excluded from production builds
- Check TypeScript types match backend schemas
- Verify all required fields are present in mock data 