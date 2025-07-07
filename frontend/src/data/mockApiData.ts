import type { 
  CrawlerStatus, 
  CrawlJob, 
  Metrics, 
  QueueStatus, 
  CrawlerConfig, 
  ScheduledJob, 
  NextRun 
} from '../types';

// Helper function to generate random data
const generateRandomData = (timeRange: '24h' | '7d' | 'all') => {
  const points = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 40;
  const pages_crawled_over_time = Array.from({ length: points }, () => Math.floor(Math.random() * 1000) + 200);
  const errors_over_time = Array.from({ length: points }, () => Math.floor(Math.random() * 50));
  const queue_size_over_time = Array.from({ length: points }, (_, i) => Math.floor(Math.random() * 2000) + 1000 + i * 50);
  
  return { pages_crawled_over_time, errors_over_time, queue_size_over_time };
};

// Mock Crawler Status
export const mockCrawlerStatus: CrawlerStatus = {
  crawler_running: true,
  uptime_seconds: 12456.78,
  pages_crawled_total: 1234567,
  max_pages_configured: 10000,
  pages_remaining_in_limit: 7654,
  avg_pages_per_second: 15.8,
  frontier_queue_size: 5432,
  urls_in_processing: 12,
  urls_completed_redis: 1215678,
  urls_seen_redis: 2345678,
  bloom_filter_items: 3456789,
  robots_denied_count: 1234,
  total_errors_count: 4021,
  active_workers_configured: 4,
  current_time_utc: new Date().toISOString(),
  allowed_domains: ['northeastern.edu', 'nyu.edu', 'stanford.edu', 'mit.edu', 'harvard.edu']
};

// Mock Jobs Data
export const mockJobs: CrawlJob[] = [
  {
    id: 'job-001',
    name: 'Northeastern University Crawl',
    domain: 'northeastern.edu',
    status: 'running',
    progress: 67.5,
    pages_found: 2345,
    errors: 23,
    start_time: '2024-01-15T10:30:00Z',
    end_time: null,
    max_depth: 3,
    max_pages: 5000,
    scheduled: false,
    priority: 'high',
    description: 'Comprehensive crawl of Northeastern University website',
    tags: ['education', 'university', 'research'],
    data_size: '45.2 MB',
    avg_response_time: '1.2s',
    success_rate: 98.9,
    created_at: '2024-01-15T10:25:00Z',
    updated_at: '2024-01-15T14:30:00Z'
  },
  {
    id: 'job-002',
    name: 'NYU Academic Pages',
    domain: 'nyu.edu',
    status: 'completed',
    progress: 100.0,
    pages_found: 1890,
    errors: 12,
    start_time: '2024-01-14T09:00:00Z',
    end_time: '2024-01-14T16:45:00Z',
    max_depth: 2,
    max_pages: 2000,
    scheduled: false,
    priority: 'medium',
    description: 'Academic department pages crawl',
    tags: ['education', 'academic'],
    data_size: '32.1 MB',
    avg_response_time: '0.8s',
    success_rate: 99.4,
    created_at: '2024-01-14T08:55:00Z',
    updated_at: '2024-01-14T16:45:00Z'
  },
  {
    id: 'job-003',
    name: 'Stanford Research Crawl',
    domain: 'stanford.edu',
    status: 'paused',
    progress: 34.2,
    pages_found: 890,
    errors: 45,
    start_time: '2024-01-15T08:00:00Z',
    end_time: null,
    max_depth: 4,
    max_pages: 8000,
    scheduled: true,
    priority: 'high',
    description: 'Research publications and labs crawl',
    tags: ['research', 'publications', 'labs'],
    data_size: '18.7 MB',
    avg_response_time: '1.5s',
    success_rate: 95.1,
    created_at: '2024-01-15T07:55:00Z',
    updated_at: '2024-01-15T12:30:00Z'
  },
  {
    id: 'job-004',
    name: 'MIT Engineering',
    domain: 'mit.edu',
    status: 'failed',
    progress: 12.5,
    pages_found: 234,
    errors: 156,
    start_time: '2024-01-13T14:00:00Z',
    end_time: '2024-01-13T15:30:00Z',
    max_depth: 3,
    max_pages: 3000,
    scheduled: false,
    priority: 'medium',
    description: 'Engineering department crawl',
    tags: ['engineering', 'technology'],
    data_size: '4.2 MB',
    avg_response_time: '2.1s',
    success_rate: 60.0,
    created_at: '2024-01-13T13:55:00Z',
    updated_at: '2024-01-13T15:30:00Z'
  },
  {
    id: 'job-005',
    name: 'Harvard Library',
    domain: 'harvard.edu',
    status: 'queued',
    progress: 0.0,
    pages_found: 0,
    errors: 0,
    start_time: null,
    end_time: null,
    max_depth: 2,
    max_pages: 1500,
    scheduled: true,
    priority: 'low',
    description: 'Library resources crawl',
    tags: ['library', 'resources'],
    data_size: '0 MB',
    avg_response_time: '0s',
    success_rate: 0.0,
    created_at: '2024-01-15T16:00:00Z',
    updated_at: '2024-01-15T16:00:00Z'
  }
];

// Mock Metrics Data
export const getMockMetrics = (timeRange: '24h' | '7d' | 'all'): Metrics => {
  const { pages_crawled_over_time, errors_over_time, queue_size_over_time } = generateRandomData(timeRange);
  
  return {
    pages_crawled: 1234567,
    errors: 4021,
    robots_denied: 1234,
    avg_response_time: 1.2,
    cache_hit_rate: 85.5,
    pages_crawled_over_time,
    errors_over_time,
    total_data_size: '156.7 MB',
    content_type_counts: {
      'text/html': 45678,
      'application/json': 12345,
      'text/plain': 8901,
      'application/pdf': 2345,
      'image/jpeg': 5678,
      'image/png': 3456,
      'application/xml': 1234,
      'text/css': 2345,
      'application/javascript': 3456,
      'other': 1234
    },
    status_code_counts: {
      '200': 1234567,
      '404': 12345,
      '301': 8901,
      '302': 5678,
      '500': 2345,
      '403': 1234,
      'other': 567
    },
    queue_size_over_time
  };
};

// Mock Queue Status
export const mockQueueStatus: QueueStatus = {
  queue_size: 5432,
  processing_count: 12,
  completed_count: 1215678,
  seen_count: 2345678,
  redis_connected: true
};

// Mock Crawler Config
export const mockCrawlerConfig: CrawlerConfig = {
  workers: 4,
  max_depth: 3,
  max_pages: 10000,
  allowed_domains: ['northeastern.edu', 'nyu.edu', 'stanford.edu', 'mit.edu', 'harvard.edu'],
  delay: 1.0,
  timeout: 30,
  user_agent: 'DonutBot/1.0',
  bloom_capacity: 1000000,
  bloom_error_rate: 0.01,
  idle_shutdown_threshold: 300,
  metrics_interval: 60,
  request_timeout: 30,
  max_connections: 100,
  allow_redirects: true,
  respect_robots_txt: true,
  robots_cache_time: 3600,
  ssl_verification_enabled: true,
  max_content_size: 10485760,
  excluded_extensions: ['.pdf', '.zip', '.exe', '.mp4'],
  priority_patterns: ['/research/', '/publications/', '/faculty/'],
  allowed_content_types: ['text/html', 'application/json', 'text/plain'],
  rate_limits: {
    'northeastern.edu': 2.0,
    'nyu.edu': 1.5,
    'stanford.edu': 1.0,
    'mit.edu': 1.0,
    'harvard.edu': 1.0
  },
  additional_headers: {
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate'
  }
};

// Mock Scheduled Jobs
export const mockScheduledJobs: ScheduledJob[] = [
  {
    id: 'sched-001',
    name: 'Daily Northeastern Crawl',
    domain: 'northeastern.edu',
    status: 'enabled',
    schedule: '0 2 * * *', // Daily at 2 AM
    nextRun: '2024-01-16T02:00:00Z',
    lastRun: '2024-01-15T02:00:00Z',
    priority: 'medium',
    category: 'daily',
    config: {
      workers: 3,
      max_depth: 2,
      max_pages: 2000,
      delay: 1.5
    },
    urls: ['https://northeastern.edu', 'https://northeastern.edu/research'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T02:00:00Z'
  },
  {
    id: 'sched-002',
    name: 'Weekly Stanford Research',
    domain: 'stanford.edu',
    status: 'enabled',
    schedule: '0 3 * * 1', // Every Monday at 3 AM
    nextRun: '2024-01-22T03:00:00Z',
    lastRun: '2024-01-15T03:00:00Z',
    priority: 'high',
    category: 'weekly',
    config: {
      workers: 4,
      max_depth: 3,
      max_pages: 5000,
      delay: 1.0
    },
    urls: ['https://stanford.edu/research', 'https://stanford.edu/publications'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T03:00:00Z'
  },
  {
    id: 'sched-003',
    name: 'Monthly Harvard Library',
    domain: 'harvard.edu',
    status: 'disabled',
    schedule: '0 4 1 * *', // First day of month at 4 AM
    nextRun: '2024-02-01T04:00:00Z',
    lastRun: '2024-01-01T04:00:00Z',
    priority: 'low',
    category: 'monthly',
    config: {
      workers: 2,
      max_depth: 2,
      max_pages: 1000,
      delay: 2.0
    },
    urls: ['https://library.harvard.edu'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T04:00:00Z'
  }
];

// Mock Next Runs
export const mockNextRuns: NextRun[] = [
  {
    job_id: 'sched-001',
    job_name: 'Daily Northeastern Crawl',
    next_run: '2024-01-16T02:00:00Z',
    schedule: '0 2 * * *'
  },
  {
    job_id: 'sched-002',
    job_name: 'Weekly Stanford Research',
    next_run: '2024-01-22T03:00:00Z',
    schedule: '0 3 * * 1'
  },
  {
    job_id: 'sched-003',
    job_name: 'Monthly Harvard Library',
    next_run: '2024-02-01T04:00:00Z',
    schedule: '0 4 1 * *'
  }
];

// Mock API Responses
export const mockApiResponses = {
  // Crawler Status
  crawlerStatus: {
    success: true,
    data: mockCrawlerStatus
  },

  // Jobs
  jobs: {
    success: true,
    data: {
      jobs: mockJobs,
      count: mockJobs.length,
      total: mockJobs.length,
      page: 1,
      size: 100
    }
  },

  // Metrics
  metrics: (timeRange: '24h' | '7d' | 'all') => ({
    success: true,
    data: getMockMetrics(timeRange)
  }),

  // Queue Status
  queueStatus: {
    success: true,
    data: mockQueueStatus
  },

  // Config
  config: {
    success: true,
    data: mockCrawlerConfig
  },

  // Allowed Domains
  allowedDomains: {
    success: true,
    data: {
      allowed_domains: mockCrawlerConfig.allowed_domains
    }
  },

  // Scheduled Jobs
  scheduledJobs: {
    success: true,
    data: {
      scheduled_jobs: mockScheduledJobs,
      count: mockScheduledJobs.length,
      total: mockScheduledJobs.length,
      page: 1,
      size: 100
    }
  },

  // Next Runs
  nextRuns: {
    success: true,
    data: {
      next_runs: mockNextRuns,
      count: mockNextRuns.length
    }
  },

  // Health Check
  health: {
    success: true,
    data: {
      status: 'healthy',
      service: 'donut-bot-api',
      timestamp: new Date().toISOString()
    }
  },

  // Kafka Status
  kafkaStatus: {
    success: true,
    data: {
      connected: true,
      brokers: ['localhost:9092'],
      topics: ['raw-documents', 'processed-documents'],
      consumer_groups: ['crawler-group'],
      producer_status: 'active',
      consumer_status: 'active'
    }
  },

  // Storage Status
  storageStatus: {
    success: true,
    data: {
      local_storage: {
        enabled: true,
        directory: '/app/crawler_output',
        total_size: '2.3 GB',
        file_count: 12345,
        last_cleanup: '2024-01-15T00:00:00Z'
      },
      kafka_storage: {
        enabled: false,
        topic: 'raw-documents',
        message_count: 0
      }
    }
  },

  // URL Queue Operations
  addUrls: {
    success: true,
    data: {
      added_count: 10,
      skipped_count: 2,
      invalid_count: 1,
      total_processed: 13
    }
  },

  clearUrls: {
    success: true,
    data: {
      cleared_count: 5432,
      message: 'URL queue cleared successfully'
    }
  },

  // Crawler Control Operations
  startCrawler: {
    success: true,
    data: {
      message: 'Crawler started successfully'
    }
  },

  stopCrawler: {
    success: true,
    data: {
      message: 'Crawler stopped successfully'
    }
  },

  pauseCrawler: {
    success: true,
    data: {
      message: 'Crawler paused successfully'
    }
  },

  resumeCrawler: {
    success: true,
    data: {
      message: 'Crawler resumed successfully'
    }
  },

  // Job Operations
  createJob: {
    success: true,
    data: mockJobs[0]
  },

  updateJob: {
    success: true,
    data: mockJobs[0]
  },

  deleteJob: {
    success: true,
    data: {
      message: 'Job deleted successfully'
    }
  },

  startJob: {
    success: true,
    data: {
      message: 'Job started successfully'
    }
  },

  stopJob: {
    success: true,
    data: {
      message: 'Job stopped successfully'
    }
  },

  pauseJob: {
    success: true,
    data: {
      message: 'Job paused successfully'
    }
  },

  resumeJob: {
    success: true,
    data: {
      message: 'Job resumed successfully'
    }
  },

  // Scheduled Job Operations
  createScheduledJob: {
    success: true,
    data: mockScheduledJobs[0]
  },

  updateScheduledJob: {
    success: true,
    data: mockScheduledJobs[0]
  },

  deleteScheduledJob: {
    success: true,
    data: {
      message: 'Scheduled job deleted successfully'
    }
  },

  enableScheduledJob: {
    success: true,
    data: {
      message: 'Scheduled job enabled successfully'
    }
  },

  disableScheduledJob: {
    success: true,
    data: {
      message: 'Scheduled job disabled successfully'
    }
  },

  // Error Responses
  error: (message: string) => ({
    success: false,
    error: message
  }),

  // Network Error
  networkError: {
    success: false,
    error: 'Network error: Failed to fetch'
  },

  // Server Error
  serverError: {
    success: false,
    error: 'Internal server error'
  }
};

// Mock API Service with delay simulation
export const createMockApiService = (delayMs: number = 300) => {
  const delay = () => new Promise(resolve => setTimeout(resolve, delayMs));

  return {
    // Crawler Management
    async getCrawlerStatus() {
      await delay();
      return mockApiResponses.crawlerStatus;
    },

    async startCrawler() {
      await delay();
      return mockApiResponses.startCrawler;
    },

    async stopCrawler() {
      await delay();
      return mockApiResponses.stopCrawler;
    },

    async pauseCrawler() {
      await delay();
      return mockApiResponses.pauseCrawler;
    },

    async resumeCrawler() {
      await delay();
      return mockApiResponses.resumeCrawler;
    },

    // Jobs
    async getJobs() {
      await delay();
      return mockApiResponses.jobs;
    },

    async createJob(_job: Omit<CrawlJob, 'id'>) {
      await delay();
      return mockApiResponses.createJob;
    },

    async updateJob(_id: string, _updates: Partial<CrawlJob>) {
      await delay();
      return mockApiResponses.updateJob;
    },

    async deleteJob(_id: string) {
      await delay();
      return mockApiResponses.deleteJob;
    },

    async startJob(_id: string) {
      await delay();
      return mockApiResponses.startJob;
    },

    async stopJob(_id: string) {
      await delay();
      return mockApiResponses.stopJob;
    },

    async pauseJob(_id: string) {
      await delay();
      return mockApiResponses.pauseJob;
    },

    async resumeJob(_id: string) {
      await delay();
      return mockApiResponses.resumeJob;
    },

    // Metrics
    async getMetrics(timeRange: '24h' | '7d' | 'all') {
      await delay();
      return mockApiResponses.metrics(timeRange);
    },

    // Queue Status
    async getQueueStatus() {
      await delay();
      return mockApiResponses.queueStatus;
    },

    // Config
    async getConfig() {
      await delay();
      return mockApiResponses.config;
    },

    async updateConfig(config: Partial<CrawlerConfig>) {
      await delay();
      return { success: true, data: { ...mockCrawlerConfig, ...config } };
    },

    async getAllowedDomains() {
      await delay();
      return mockApiResponses.allowedDomains;
    },

    async updateAllowedDomains(action: 'add' | 'remove' | 'replace', _domains: string[]) {
      await delay();
      return { success: true, data: { message: `Domains ${action}ed successfully` } };
    },

    // Scheduled Jobs
    async getScheduledJobs() {
      await delay();
      return mockApiResponses.scheduledJobs;
    },

    async createScheduledJob(_job: Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt'>) {
      await delay();
      return mockApiResponses.createScheduledJob;
    },

    async updateScheduledJob(_id: string, _updates: Partial<ScheduledJob>) {
      await delay();
      return mockApiResponses.updateScheduledJob;
    },

    async deleteScheduledJob(_id: string) {
      await delay();
      return mockApiResponses.deleteScheduledJob;
    },

    async enableScheduledJob(_id: string) {
      await delay();
      return mockApiResponses.enableScheduledJob;
    },

    async disableScheduledJob(_id: string) {
      await delay();
      return mockApiResponses.disableScheduledJob;
    },

    async getNextRuns() {
      await delay();
      return mockApiResponses.nextRuns;
    },

    // Health
    async healthCheck() {
      await delay();
      return mockApiResponses.health;
    },

    // URL Management
    async addUrls(_urls: string[]) {
      await delay();
      return mockApiResponses.addUrls;
    },

    async clearUrls() {
      await delay();
      return mockApiResponses.clearUrls;
    },

    // Kafka Status
    async getKafkaStatus() {
      await delay();
      return mockApiResponses.kafkaStatus;
    },

    // Storage Status
    async getStorageStatus() {
      await delay();
      return mockApiResponses.storageStatus;
    }
  };
};

export default mockApiResponses; 