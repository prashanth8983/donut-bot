import type { ApiResponse, CrawlerConfig, CrawlerStatus, CrawlJob, QueueStatus, Metrics, ScheduledJob, NextRun } from '../types';

interface JobsResponse {
  jobs: CrawlJob[];
  count: number;
}

interface ScheduledJobsResponse {
  scheduled_jobs: ScheduledJob[];
  count: number;
}

interface NextRunsResponse {
  next_runs: NextRun[];
  count: number;
}

interface AllowedDomainsResponse {
  allowed_domains: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8089';

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Crawler Management
  async startCrawler(config?: CrawlerConfig): Promise<ApiResponse<any>> {
    return this.request('/api/v1/crawler/start', {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  }

  async stopCrawler(): Promise<ApiResponse<any>> {
    return this.request('/api/v1/crawler/stop', {
      method: 'POST',
    });
  }

  async getCrawlerStatus(): Promise<ApiResponse<CrawlerStatus>> {
    return this.request<CrawlerStatus>('/api/v1/crawler/status/');
  }

  async resetCrawler(options?: {
    redis_completed?: boolean;
    redis_seen?: boolean;
    redis_processing?: boolean;
    redis_queue?: boolean;
    bloom_filter?: boolean;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (options?.redis_completed !== undefined) params.append('clear_completed', options.redis_completed.toString());
    if (options?.redis_seen !== undefined) params.append('clear_seen', options.redis_seen.toString());
    if (options?.redis_processing !== undefined) params.append('clear_processing', options.redis_processing.toString());
    if (options?.redis_queue !== undefined) params.append('clear_queue', options.redis_queue.toString());
    if (options?.bloom_filter !== undefined) params.append('clear_bloom_filter', options.bloom_filter.toString());
    
    return this.request(`/api/v1/crawler/flush_status?${params.toString()}`, {
      method: 'POST',
    });
  }

  // URL Management
  async addUrls(urls: string[]): Promise<ApiResponse<any>> {
    return this.request('/api/v1/urls/add', {
      method: 'POST',
      body: JSON.stringify({ urls }),
    });
  }

  async getQueueStatus(): Promise<ApiResponse<QueueStatus>> {
    return this.request<QueueStatus>('/api/v1/urls/queue/');
  }

  async clearUrls(): Promise<ApiResponse<any>> {
    return this.request('/api/v1/urls/clear', {
      method: 'DELETE',
    });
  }

  // Configuration Management
  async getConfig(): Promise<ApiResponse<CrawlerConfig>> {
    return this.request<CrawlerConfig>('/api/v1/config/');
  }

  async updateConfig(config: Partial<CrawlerConfig>): Promise<ApiResponse<any>> {
    return this.request('/api/v1/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async getAllowedDomains(): Promise<ApiResponse<AllowedDomainsResponse>> {
    return this.request<AllowedDomainsResponse>('/api/v1/config/domains/');
  }

  async updateAllowedDomains(
    action: 'add' | 'remove' | 'replace',
    domains: string[]
  ): Promise<ApiResponse<any>> {
    return this.request('/api/v1/config/domains', {
      method: 'PUT',
      body: JSON.stringify({ action, domains }),
    });
  }

  // Metrics and Statistics
  async getMetrics(timeRange: '24h' | '7d' | 'all'): Promise<ApiResponse<Metrics>> {
    return this.request<Metrics>(`/api/v1/metrics/?time_range=${timeRange}`);
  }

  async getStats(): Promise<ApiResponse<unknown>> {
    return this.request('/api/v1/stats');
  }

  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>('/api/v1/health/');
  }

  // Results and Data
  async getResults(): Promise<ApiResponse<unknown[]>> {
    return this.request('/api/v1/results');
  }

  async getResultByUrl(urlHash: string): Promise<ApiResponse<unknown>> {
    return this.request(`/api/v1/results/${urlHash}`);
  }

  async clearResults(): Promise<ApiResponse<any>> {
    return this.request('/api/v1/results', {
      method: 'DELETE',
    });
  }

  // Job Management (MongoDB-based)
  async createJob(job: Omit<CrawlJob, 'id'>): Promise<ApiResponse<CrawlJob>> {
    return this.request<CrawlJob>('/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  }

  async getJobs(): Promise<ApiResponse<JobsResponse>> {
    return this.request<JobsResponse>('/api/v1/jobs/');
  }

  async getJob(id: string): Promise<ApiResponse<CrawlJob>> {
    return this.request<CrawlJob>(`/api/v1/jobs/${id}`);
  }

  async updateJob(id: string, updates: Partial<CrawlJob>): Promise<ApiResponse<CrawlJob>> {
    return this.request<CrawlJob>(`/api/v1/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/jobs/${id}`, {
      method: 'DELETE',
    });
  }

  async startJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/jobs/${id}/start`, {
      method: 'POST',
    });
  }

  async stopJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/jobs/${id}/stop`, {
      method: 'POST',
    });
  }

  async pauseJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/jobs/${id}/pause`, {
      method: 'POST',
    });
  }

  async resumeJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/jobs/${id}/resume`, {
      method: 'POST',
    });
  }

  // Scheduler Management
  async getScheduledJobs(): Promise<ApiResponse<ScheduledJobsResponse>> {
    return this.request<ScheduledJobsResponse>('/api/v1/scheduler/jobs');
  }

  async createScheduledJob(job: Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<ScheduledJob>> {
    return this.request<ScheduledJob>('/api/v1/scheduler/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  }

  async updateScheduledJob(id: string, updates: Partial<ScheduledJob>): Promise<ApiResponse<ScheduledJob>> {
    return this.request<ScheduledJob>(`/api/v1/scheduler/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteScheduledJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/scheduler/jobs/${id}`, {
      method: 'DELETE',
    });
  }

  async enableScheduledJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/scheduler/jobs/${id}/enable`, {
      method: 'POST',
    });
  }

  async disableScheduledJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/scheduler/jobs/${id}/disable`, {
      method: 'POST',
    });
  }

  async getNextRuns(): Promise<ApiResponse<NextRunsResponse>> {
    return this.request<NextRunsResponse>('/api/v1/scheduler/next-runs/');
  }
}

export const apiService = new ApiService(); 