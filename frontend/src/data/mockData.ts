import type { CrawlJob } from '../types';

export const mockJobs: CrawlJob[] = [
  {
    id: '1',
    name: 'E-commerce Site Crawl',
    domain: 'example.com',
    status: 'running',
    progress: 65,
          pages_found: 1250,
    errors: 3,
    start_time: '2024-01-15T10:30:00Z',
    end_time: '2024-01-15T14:30:00Z',
    max_depth: 3,
    max_pages: 2000,
    scheduled: false,
    priority: 'high',
    description: 'E-commerce',
    tags: ['ecommerce'],
    data_size: '2.5 MB',
    avg_response_time: '1.2s',
    success_rate: 98.5,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'News Site Analysis',
    domain: 'news.example.org',
    status: 'completed',
    progress: 100,
    pages_found: 850,
    errors: 0,
    start_time: '2024-01-14T09:00:00Z',
    end_time: '2024-01-14T12:00:00Z',
    max_depth: 2,
    max_pages: 1000,
    scheduled: true,
    priority: 'medium',
    description: 'News',
    tags: ['news'],
    data_size: '1.8 MB',
    avg_response_time: '0.8s',
    success_rate: 100,
    created_at: '2024-01-14T08:00:00Z',
    updated_at: '2024-01-14T12:00:00Z'
  },
  {
    id: '3',
    name: 'Blog Content Crawl',
    domain: 'blog.example.net',
    status: 'paused',
    progress: 45,
    pages_found: 320,
    errors: 1,
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T11:00:00Z',
    max_depth: 4,
    max_pages: 500,
    scheduled: false,
    priority: 'low',
    description: 'Blog',
    tags: ['blog'],
    data_size: '0.9 MB',
    avg_response_time: '1.5s',
    success_rate: 95.2,
    created_at: '2024-01-15T07:00:00Z',
    updated_at: '2024-01-15T08:00:00Z'
  },
]; 