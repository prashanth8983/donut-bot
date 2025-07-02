export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CrawlerConfig {
  workers?: number;
  max_depth?: number;
  max_pages?: number;
  allowed_domains?: string[];
  delay?: number;
  timeout?: number;
  user_agent?: string;
  // Advanced settings
  bloom_capacity?: number;
  bloom_error_rate?: number;
  idle_shutdown_threshold?: number;
  metrics_interval?: number;
  request_timeout?: number;
  max_connections?: number;
  allow_redirects?: boolean;
  respect_robots_txt?: boolean;
  robots_cache_time?: number;
  ssl_verification_enabled?: boolean;
  max_content_size?: number;
  excluded_extensions?: string[];
  priority_patterns?: string[];
  allowed_content_types?: string[];
  rate_limits?: Record<string, number>;
  additional_headers?: Record<string, string>;
}

export interface CrawlerStatus {
  crawler_running: boolean;
  uptime_seconds: number;
  pages_crawled_total: number;
  max_pages_configured: number | string;
  pages_remaining_in_limit: number | string;
  avg_pages_per_second: number;
  frontier_queue_size: number;
  urls_in_processing: number;
  urls_completed_redis: number;
  urls_seen_redis: number;
  bloom_filter_items: number;
  robots_denied_count: number;
  total_errors_count: number;
  active_workers_configured: number;
  current_time_utc: string;
  allowed_domains: string[];
}

export interface CrawlJob {
  id: string;
  name: string;
  domain: string;
  status: 'running' | 'completed' | 'paused' | 'failed' | 'queued';
  progress: number;
  pagesFound: number;
  errors: number;
  startTime: string;
  estimatedEnd: string;
  depth: number;
  scheduled: boolean;
  priority: 'high' | 'medium' | 'low';
  category: string;
  dataSize: string;
  avgResponseTime: string;
  successRate: number;
  config: CrawlerConfig;
  urls: string[];
}

export interface QueueStatus {
  queue_size: number;
  processing_urls: number;
  completed_urls: number;
  seen_urls: number;
  redis_connected: boolean;
}

export interface Metrics {
  pages_crawled: number;
  errors: number;
  robots_denied: number;
  avg_response_time: number;
  cache_hit_rate: number;
  pages_crawled_over_time: number[];
  errors_over_time: number[];
  total_data_size?: string;
  content_type_counts?: Record<string, number>;
  status_code_counts?: Record<string, number>;
  queue_size_over_time?: number[];
}

export interface ScheduledJob {
  id: string;
  name: string;
  domain: string;
  status: 'enabled' | 'disabled' | 'running' | 'completed' | 'failed';
  schedule: string; // Cron expression
  nextRun: string;
  lastRun?: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  config: CrawlerConfig;
  urls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NextRun {
  job_id: string;
  job_name: string;
  next_run: string;
  schedule: string;
}

export interface SchedulerStats {
  total_scheduled_jobs: number;
  enabled_jobs: number;
  disabled_jobs: number;
  next_runs: NextRun[];
} 