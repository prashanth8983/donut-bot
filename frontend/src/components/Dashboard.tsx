import React, { useEffect, useState } from 'react';
import {  RefreshCw, Activity, Globe, Database, AlertCircle, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/api';
import type { CrawlerStatus, CrawlJob, Metrics, QueueStatus } from '../types';
import { StatCard } from './StatCard';
import { useDashboard } from '../contexts/DashboardContext';

export const Dashboard: React.FC = () => {
  const { isDarkMode } = useDashboard();
  const [crawlerStatus, setCrawlerStatus] = useState<CrawlerStatus | null>(null);
  const [crawlJobs, setCrawlJobs] = useState<CrawlJob[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [performanceData, setPerformanceData] = useState([
    { time: '00:00', pages: 0, errors: 0, cache: 0, bandwidth: 0 },
    { time: '04:00', pages: 0, errors: 0, cache: 0, bandwidth: 0 },
    { time: '08:00', pages: 0, errors: 0, cache: 0, bandwidth: 0 },
    { time: '12:00', pages: 0, errors: 0, cache: 0, bandwidth: 0 },
    { time: '16:00', pages: 0, errors: 0, cache: 0, bandwidth: 0 },
    { time: '20:00', pages: 0, errors: 0, cache: 0, bandwidth: 0 }
  ]);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, jobsRes, metricsRes, queueRes] = await Promise.all([
        apiService.getCrawlerStatus(),
        apiService.getJobs(),
        apiService.getMetrics(),
        apiService.getQueueStatus()
      ]);

      if (statusRes.success) setCrawlerStatus(statusRes.data || null);
      else setError(statusRes.error || 'Failed to fetch status');
      
      if (jobsRes.success) setCrawlJobs(jobsRes.data?.jobs || []);
      else setError(jobsRes.error || 'Failed to fetch jobs');
      
      if (metricsRes.success) setMetrics(metricsRes.data || null);
      else setError(metricsRes.error || 'Failed to fetch metrics');
      
      if (queueRes.success) setQueueStatus(queueRes.data || null);
      else setError(queueRes.error || 'Failed to fetch queue status');
      
    } catch (err) {
      setError('An unexpected error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (crawlerStatus && metrics) {
      const now = new Date();
      const currentHour = now.getHours();
      
      setPerformanceData(prev => {
        const newData = [...prev];
        const currentIndex = Math.floor(currentHour / 4);
        
        if (currentIndex < newData.length) {
          newData[currentIndex] = {
            time: `${String(currentHour).padStart(2, '0')}:00`,
            pages: crawlerStatus.pages_crawled_total,
            errors: crawlerStatus.total_errors_count,
            cache: metrics.cache_hit_rate,
            bandwidth: crawlerStatus.avg_pages_per_second
          };
        }
        
        return newData;
      });
    }
  }, [crawlerStatus, metrics]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>Dashboard Overview</h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      {error && (
        <div className={`${isDarkMode ? 'bg-red-900/50 border-red-700 text-red-200' : 'bg-red-100 border-red-200 text-red-800'} border p-4 rounded-lg flex items-center gap-2`}>
          <AlertCircle className="w-5 h-5" />
          <span>Error: {error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Pages Crawled"
          value={crawlerStatus?.pages_crawled_total.toLocaleString() ?? '0'}
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
          title="Cache Hit Rate"
          value={`${Math.round(metrics?.cache_hit_rate ?? 0)}%`}
          subtitle="Redis performance"
          icon={Database}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
            <TrendingUp className="w-5 h-5" />
            Performance Metrics
          </h2>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
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
                <Area type="monotone" dataKey="pages" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="errors" stackId="1" stroke="#ff4d4d" fill="#ff4d4d" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-4`}>System Resources</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className={`font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'}`}>Queue Size</span>
                <span className={isDarkMode ? 'text-stone-200' : 'text-gray-900'}>{queueStatus?.queue_size.toLocaleString() ?? '0'}</span>
              </div>
              <div className={`w-full ${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} rounded-full h-2.5`}>
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(queueStatus?.queue_size ?? 0) / 1000 * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className={`font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'}`}>Processing</span>
                <span className={isDarkMode ? 'text-stone-200' : 'text-gray-900'}>{queueStatus?.processing_urls.toLocaleString() ?? '0'}</span>
              </div>
              <div className={`w-full ${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} rounded-full h-2.5`}>
                <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${(queueStatus?.processing_urls ?? 0) / 100 * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className={`font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'}`}>Completed</span>
                <span className={isDarkMode ? 'text-stone-200' : 'text-gray-900'}>{queueStatus?.completed_urls.toLocaleString() ?? '0'}</span>
              </div>
              <div className={`w-full ${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} rounded-full h-2.5`}>
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${(queueStatus?.completed_urls ?? 0) / 10000 * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className={`font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'}`}>Errors</span>
                <span className={isDarkMode ? 'text-stone-200' : 'text-gray-900'}>{crawlerStatus?.total_errors_count.toLocaleString() ?? '0'}</span>
              </div>
              <div className={`w-full ${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} rounded-full h-2.5`}>
                <div className="bg-red-600 h-2.5 rounded-full" style={{ width: `${(crawlerStatus?.total_errors_count ?? 0) / 100 * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 