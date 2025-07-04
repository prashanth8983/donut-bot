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

import { API_BASE_URL } from '../constants/api';

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
    return this.request('/crawler/start', {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  }

  async stopCrawler(): Promise<ApiResponse<any>> {
    return this.request('/crawler/stop', {
      method: 'POST',
    });
  }

  async getCrawlerStatus(): Promise<ApiResponse<CrawlerStatus>> {
    return this.request<CrawlerStatus>('/crawler/status/');
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
    
    return this.request(`/crawler/flush_status?${params.toString()}`, {
      method: 'POST',
    });
  }

  // URL Management
  async addUrls(urls: string[]): Promise<ApiResponse<any>> {
    return this.request('/urls/add', {
      method: 'POST',
      body: JSON.stringify({ urls }),
    });
  }

  async getQueueStatus(): Promise<ApiResponse<QueueStatus>> {
    return this.request<QueueStatus>('/urls/queue/');
  }

  async clearUrls(): Promise<ApiResponse<any>> {
    return this.request('/urls/clear', {
      method: 'DELETE',
    });
  }

  // Configuration Management
  async getConfig(): Promise<ApiResponse<CrawlerConfig>> {
    return this.request<CrawlerConfig>('/config/');
  }

  async updateConfig(config: Partial<CrawlerConfig>): Promise<ApiResponse<any>> {
    return this.request('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async getAllowedDomains(): Promise<ApiResponse<AllowedDomainsResponse>> {
    return this.request<AllowedDomainsResponse>('/config/domains/');
  }

  async updateAllowedDomains(
    action: 'add' | 'remove' | 'replace',
    domains: string[]
  ): Promise<ApiResponse<any>> {
    return this.request('/config/domains', {
      method: 'PUT',
      body: JSON.stringify({ action, domains }),
    });
  }

  // Metrics and Statistics
  async getMetrics(timeRange: '24h' | '7d' | 'all'): Promise<ApiResponse<Metrics>> {
    return this.request<Metrics>(`/metrics/?time_range=${timeRange}`);
  }

  async getStats(): Promise<ApiResponse<unknown>> {
    return this.request('/stats');
  }

  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>('/health/');
  }

  // Results and Data
  async getResults(): Promise<ApiResponse<unknown[]>> {
    return this.request('/results');
  }

  async getResultByUrl(urlHash: string): Promise<ApiResponse<unknown>> {
    return this.request(`/results/${urlHash}`);
  }

  async clearResults(): Promise<ApiResponse<any>> {
    return this.request('/results', {
      method: 'DELETE',
    });
  }

  // Job Management (MongoDB-based)
  async createJob(job: Omit<CrawlJob, 'id'>): Promise<ApiResponse<CrawlJob>> {
    return this.request<CrawlJob>('/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  }

  async getJobs(): Promise<ApiResponse<JobsResponse>> {
    return this.request<JobsResponse>('/jobs/');
  }

  async getJob(id: string): Promise<ApiResponse<CrawlJob>> {
    return this.request<CrawlJob>(`/jobs/${id}`);
  }

  async updateJob(id: string, updates: Partial<CrawlJob>): Promise<ApiResponse<CrawlJob>> {
    return this.request<CrawlJob>(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/jobs/${id}`, {
      method: 'DELETE',
    });
  }

  async startJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/jobs/${id}/start`, {
      method: 'POST',
    });
  }

  async stopJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/jobs/${id}/stop`, {
      method: 'POST',
    });
  }

  async pauseJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/jobs/${id}/pause`, {
      method: 'POST',
    });
  }

  async resumeJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/jobs/${id}/resume`, {
      method: 'POST',
    });
  }

  // Scheduler Management
  async getScheduledJobs(): Promise<ApiResponse<ScheduledJobsResponse>> {
    return this.request<ScheduledJobsResponse>('/scheduler/jobs');
  }

  async createScheduledJob(job: Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<ScheduledJob>> {
    return this.request<ScheduledJob>('/scheduler/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  }

  async updateScheduledJob(id: string, updates: Partial<ScheduledJob>): Promise<ApiResponse<ScheduledJob>> {
    return this.request<ScheduledJob>(`/scheduler/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteScheduledJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/scheduler/jobs/${id}`, {
      method: 'DELETE',
    });
  }

  async enableScheduledJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/scheduler/jobs/${id}/enable`, {
      method: 'POST',
    });
  }

  async disableScheduledJob(id: string): Promise<ApiResponse<any>> {
    return this.request(`/scheduler/jobs/${id}/disable`, {
      method: 'POST',
    });
  }

  async getNextRuns(): Promise<ApiResponse<NextRunsResponse>> {
    return this.request<NextRunsResponse>('/scheduler/next-runs/');
  }
}

export const apiService = new ApiService(); 