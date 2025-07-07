// API Mode Configuration
// Set this to 'mock' to use mock data, 'real' to use actual backend APIs
export const API_MODE = process.env.NODE_ENV === 'development' ? 'mock' : 'real';

// You can also override this manually for testing
// export const API_MODE = 'mock'; // Force mock mode
// export const API_MODE = 'real'; // Force real mode

export const isMockMode = () => API_MODE === 'mock';
export const isRealMode = () => API_MODE === 'real';

// Mock delay configuration
export const MOCK_DELAY_MS = 300; // Simulate network delay

// Environment variables for API configuration
export const API_CONFIG = {
  baseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:8089/api/v1',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Helper function to get the appropriate API service
export const getApiService = () => {
  if (isMockMode()) {
    // Import mock service dynamically to avoid bundling in production
    return import('../data/mockApiData').then(module => module.createMockApiService(MOCK_DELAY_MS));
  } else {
    // Import real service
    return import('../services/api').then(module => module.apiService);
  }
};

// Helper function to check if we should use mock data
export const shouldUseMockData = () => {
  return isMockMode() || process.env.NODE_ENV === 'test';
};

// Log current API mode
if (process.env.NODE_ENV === 'development') {
  console.log(`🔧 API Mode: ${API_MODE.toUpperCase()}`);
  console.log(`🌐 Base URL: ${API_CONFIG.baseUrl}`);
  if (isMockMode()) {
    console.log(`⏱️  Mock Delay: ${MOCK_DELAY_MS}ms`);
  }
} 