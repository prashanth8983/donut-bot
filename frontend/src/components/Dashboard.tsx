import React, { useEffect, useState } from 'react';
import {  RefreshCw, Activity, Globe, Database,  TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { apiService } from '../services/api';
import type { CrawlerStatus, CrawlJob, Metrics, QueueStatus } from '../types';
import { StatCard } from './StatCard';
import { useDashboard } from '../contexts/DashboardContext';

export const Dashboard: React.FC = () => {
  const { isDarkMode, showNotification } = useDashboard();
  const [crawlerStatus, setCrawlerStatus] = useState<CrawlerStatus | null>(null);
  const [crawlJobs, setCrawlJobs] = useState<CrawlJob[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | 'all'>('24h');
  const [performanceData, setPerformanceData] = useState<{
    time: string;
    success: number;
    errors: number;
  }[]>([]);
  const [contentTypeData, setContentTypeData] = useState<{
    name: string;
    value: number;
  }[]>([]);
  const [statusCodeData, setStatusCodeData] = useState<{
    name: string;
    value: number;
  }[]>([]);
  const [queueSizeTrendData, setQueueSizeTrendData] = useState<{
    time: string;
    value: number;
  }[]>([]);
  

  const fetchData = React.useCallback(async () => {
    try {
      const [crawlerStatusRes, jobsRes, metricsRes, queueStatusRes] = await Promise.all([
        apiService.getCrawlerStatus(),
        apiService.getJobs(),
        apiService.getMetrics(timeRange),
        apiService.getQueueStatus(),
      ]);
      if (!crawlerStatusRes.success) {
        showNotification(`Failed to fetch crawler status: ${crawlerStatusRes.error}`, 'error');
      }
      if (!jobsRes.success) {
        showNotification(`Failed to fetch jobs: ${jobsRes.error}`, 'error');
      }
      if (!metricsRes.success) {
        showNotification(`Failed to fetch metrics: ${metricsRes.error}`, 'error');
      }
      if (!queueStatusRes.success) {
        showNotification(`Failed to fetch queue status: ${queueStatusRes.error}`, 'error');
      }
      setCrawlerStatus(crawlerStatusRes.success && crawlerStatusRes.data ? crawlerStatusRes.data : null);
      setCrawlJobs(jobsRes.success && jobsRes.data ? jobsRes.data.jobs : []);
      setMetrics(metricsRes.success && metricsRes.data ? metricsRes.data : null);
      setQueueStatus(queueStatusRes.success && queueStatusRes.data ? queueStatusRes.data : null);
    } catch (error: unknown) {
      showNotification(`Unexpected error occurred while loading dashboard: ${(error as Error).message || String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification, timeRange]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [showNotification, fetchData]);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (metrics) {
      const newPerformanceData = (metrics.pages_crawled_over_time || []).map((pages, index) => ({
        time: `Point ${index + 1}`,
        success: pages,
        errors: (metrics.errors_over_time?.[index] || 0),
      }));
      setPerformanceData(newPerformanceData);

      if (metrics.content_type_counts) {
        const newContentTypeData = Object.entries(metrics.content_type_counts).map(([name, value]) => ({
          name: name,
          value: value,
        }));
        setContentTypeData(newContentTypeData);
      }

      if (metrics.status_code_counts) {
        const newStatusCodeData = Object.entries(metrics.status_code_counts).map(([name, value]) => ({
          name: name,
          value: value,
        }));
        setStatusCodeData(newStatusCodeData);
      }

      if (metrics.queue_size_over_time) {
        const newQueueSizeTrendData = metrics.queue_size_over_time.map((value, index) => ({
          time: `Point ${index + 1}`,
          value: value,
        }));
        setQueueSizeTrendData(newQueueSizeTrendData);
      }
    }
  }, [metrics]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>Dashboard Overview</h1>
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | 'all')}
            className={`px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-stone-700 border-stone-600 text-stone-100' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Pages Crawled"
          value={typeof crawlerStatus?.pages_crawled_total === 'number' ? crawlerStatus.pages_crawled_total.toLocaleString() : '0'}
          icon={Globe}
          trend={`${Math.round(crawlerStatus?.avg_pages_per_second ?? 0)}/s`}
        />
        <StatCard
          title="Active Jobs"
          value={crawlJobs.filter(j => j.status === 'running').length}
          subtitle="Running crawlers"
          icon={Activity}
        />
        <StatCard
          title="Total Jobs"
          value={crawlJobs.length}
          subtitle="All jobs"
          icon={Activity}
        />
        <StatCard
          title="Total Data Size"
          value={metrics?.total_data_size || '0 MB'}
          subtitle="Estimated data collected"
          icon={Database}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
            <TrendingUp className="w-5 h-5" />
            Crawl Performance
          </h2>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#4a5568' : '#e2e8f0'} />
                <XAxis dataKey="time" stroke={isDarkMode ? '#a0aec0' : '#4a5568'} />
                <YAxis stroke={isDarkMode ? '#a0aec0' : '#4a5568'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
                    border: isDarkMode ? '1px solid #4a5568' : '1px solid #e2e8f0',
                    color: isDarkMode ? '#e2e8f0' : '#2d3748'
                  }}
                />
                <Legend />
                <Bar dataKey="success" fill="#82ca9d" name="Successful Crawls" />
                <Bar dataKey="errors" fill="#ff7300" name="Errors" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-4`}>System Resources</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Queue Size */}
            <div className={`${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-50'} rounded-lg p-4 flex flex-col items-center`}>
              <div className={`text-3xl font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>{typeof queueStatus?.queue_size === 'number' ? queueStatus.queue_size.toLocaleString() : '0'}</div>
              <div className={`text-sm mt-2 ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>Queue Size</div>
            </div>
            {/* Processing */}
            <div className={`${isDarkMode ? 'bg-yellow-900/50' : 'bg-yellow-50'} rounded-lg p-4 flex flex-col items-center`}>
              <div className={`text-3xl font-bold ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>{typeof queueStatus?.processing_urls === 'number' ? queueStatus.processing_urls.toLocaleString() : '0'}</div>
              <div className={`text-sm mt-2 ${isDarkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>Processing</div>
            </div>
            {/* Completed */}
            <div className={`${isDarkMode ? 'bg-green-900/50' : 'bg-green-50'} rounded-lg p-4 flex flex-col items-center`}>
              <div className={`text-3xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>{typeof queueStatus?.completed_urls === 'number' ? queueStatus.completed_urls.toLocaleString() : '0'}</div>
              <div className={`text-sm mt-2 ${isDarkMode ? 'text-green-200' : 'text-green-700'}`}>Completed</div>
            </div>
            {/* Errors */}
            <div className={`${isDarkMode ? 'bg-red-900/50' : 'bg-red-50'} rounded-lg p-4 flex flex-col items-center`}>
              <div className={`text-3xl font-bold ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{typeof crawlerStatus?.total_errors_count === 'number' ? crawlerStatus.total_errors_count.toLocaleString() : '0'}</div>
              <div className={`text-sm mt-2 ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>Errors</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-4`}>Content Type Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={contentTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {contentTypeData.map((entry, index) => (
                  <Cell key={`cell-content-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'][index % 5]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
                  border: isDarkMode ? '1px solid #4a5568' : '1px solid #e2e8f0',
                  color: isDarkMode ? '#e2e8f0' : '#2d3748'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-4`}>HTTP Status Code Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusCodeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {statusCodeData.map((entry, index) => (
                  <Cell key={`cell-status-${index}`} fill={['#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#0088FE'][index % 5]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
                  border: isDarkMode ? '1px solid #4a5568' : '1px solid #e2e8f0',
                  color: isDarkMode ? '#e2e8f0' : '#2d3748'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border`}>
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-4`}>Queue Size Trend</h2>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={queueSizeTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#4a5568' : '#e2e8f0'} />
              <XAxis dataKey="time" stroke={isDarkMode ? '#a0aec0' : '#4a5568'} />
              <YAxis stroke={isDarkMode ? '#a0aec0' : '#4a5568'} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
                  border: isDarkMode ? '1px solid #4a5568' : '1px solid #e2e8f0',
                  color: isDarkMode ? '#e2e8f0' : '#2d3748'
                }}
              />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Queue Size" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}; 