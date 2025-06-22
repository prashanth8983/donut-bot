import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Square, RotateCcw, AlertTriangle, Settings, Activity, Clock, Zap } from 'lucide-react';
import { apiService } from '../services/api';
import type { CrawlerStatus } from '../types';
import { useDashboard } from '../contexts/DashboardContext';

export const CrawlerControls: React.FC = () => {
  const { showNotification, isDarkMode } = useDashboard();
  const [status, setStatus] = useState<CrawlerStatus | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await apiService.getCrawlerStatus();
      if (response.success) {
        setStatus(response.data || null);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const handleAction = async (action: string, apiCall: () => Promise<any>) => {
    setActionLoading(action);
    try {
      const response = await apiCall();
      if (response.success) {
        showNotification(`Crawler ${action} successfully`, 'success');
        fetchStatus();
      } else {
        showNotification(`Failed to ${action} crawler: ${response.error}`, 'error');
      }
    } catch (error) {
      showNotification(`Failed to ${action} crawler`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = () => {
    handleAction('start', () => apiService.startCrawler());
  };

  const handleStop = () => {
    handleAction('stop', () => apiService.stopCrawler());
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the crawler? This will clear all queues and data.')) {
      handleAction('reset', () => apiService.resetCrawler({
        redis_completed: true,
        redis_seen: true,
        redis_processing: true,
        redis_queue: true,
        bloom_filter: true,
      }));
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getStatusColor = () => {
    if (!status) return 'gray';
    return status.crawler_running ? 'green' : 'red';
  };

  const getStatusText = () => {
    if (!status) return 'Unknown';
    return status.crawler_running ? 'Running' : 'Stopped';
  };

  return (
    <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>Crawler Controls</h2>
        </div>
        <Link
          to="/settings"
          className={`flex items-center gap-2 px-3 py-2 ${isDarkMode ? 'text-stone-400 hover:text-stone-200' : 'text-gray-600 hover:text-gray-800'} transition-colors`}
        >
          <Settings className="w-4 h-4" />
          Configure
        </Link>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${isDarkMode ? 'bg-stone-700' : 'bg-gray-50'} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full bg-${getStatusColor()}-500`}></div>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'}`}>Status</span>
          </div>
          <p className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>{getStatusText()}</p>
        </div>

        <div className={`${isDarkMode ? 'bg-stone-700' : 'bg-gray-50'} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`w-4 h-4 ${isDarkMode ? 'text-stone-400' : 'text-gray-500'}`} />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'}`}>Uptime</span>
          </div>
          <p className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>
            {status ? formatUptime(status.uptime_seconds) : '--'}
          </p>
        </div>

        <div className={`${isDarkMode ? 'bg-stone-700' : 'bg-gray-50'} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className={`w-4 h-4 ${isDarkMode ? 'text-stone-400' : 'text-gray-500'}`} />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'}`}>Pages/Second</span>
          </div>
          <p className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>
            {status ? status.avg_pages_per_second.toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleStart}
          disabled={status?.crawler_running || actionLoading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          {actionLoading === 'start' ? 'Starting...' : 'Start'}
        </button>

        <button
          onClick={handleStop}
          disabled={!status?.crawler_running || actionLoading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Square className="w-4 h-4" />
          {actionLoading === 'stop' ? 'Stopping...' : 'Stop'}
        </button>

        <button
          onClick={handleReset}
          disabled={actionLoading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
          {actionLoading === 'reset' ? 'Resetting...' : 'Reset All'}
        </button>
      </div>

      {/* Emergency Stop */}
      <div className={`${isDarkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className={`text-sm font-medium ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>Emergency Stop</span>
        </div>
        <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'} mb-3`}>
          Use this to immediately stop all crawling activities and clear all queues.
        </p>
        <button
          onClick={handleReset}
          disabled={actionLoading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AlertTriangle className="w-4 h-4" />
          Emergency Stop & Reset
        </button>
      </div>

      {/* Progress Information */}
      {status && (
        <div className="mt-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className={isDarkMode ? 'text-stone-400' : 'text-gray-600'}>Pages Crawled:</span>
            <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'}`}>{status.pages_crawled_total.toLocaleString()}</span>
          </div>
          
          {typeof status.max_pages_configured === 'number' && status.max_pages_configured > 0 && (
            <div className="flex justify-between text-sm">
              <span className={isDarkMode ? 'text-stone-400' : 'text-gray-600'}>Progress:</span>
              <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'}`}>
                {Math.round((status.pages_crawled_total / status.max_pages_configured) * 100)}%
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className={isDarkMode ? 'text-stone-400' : 'text-gray-600'}>Queue Size:</span>
            <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'}`}>{status.frontier_queue_size.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className={isDarkMode ? 'text-stone-400' : 'text-gray-600'}>Processing:</span>
            <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'}`}>{status.urls_in_processing.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className={isDarkMode ? 'text-stone-400' : 'text-gray-600'}>Completed:</span>
            <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'}`}>{status.urls_completed_redis.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className={isDarkMode ? 'text-stone-400' : 'text-gray-600'}>Errors:</span>
            <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'} text-red-600`}>{status.total_errors_count.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}; 