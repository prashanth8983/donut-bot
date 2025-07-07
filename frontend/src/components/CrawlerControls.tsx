import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Play, Square, RotateCcw, Settings, Activity, Clock, Zap, ChevronRight, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import type { CrawlerStatus } from '../types';
import { useDashboard } from '../contexts/DashboardContext';
import Card from './ui/Card';

export const CrawlerControls: React.FC = () => {
  const { showNotification, isDarkMode } = useDashboard();
  const [status, setStatus] = useState<CrawlerStatus | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uptime, setUptime] = useState<number>(0);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await apiService.getCrawlerStatus();
      if (response.success) {
        setStatus(response.data || null);
        if (response.data) {
          setUptime(response.data.uptime_seconds);
        }
      } else {
        showNotification(`Failed to fetch status: ${response.error}`, 'error');
      }
    } catch (error: unknown) {
      showNotification(`Failed to fetch status: ${(error as Error).message || String(error)}`, 'error');
    }
  }, [showNotification]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status?.crawler_running) {
      timer = setInterval(() => {
        setUptime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status?.crawler_running]);

  const handleAction = useCallback(async (action: string, apiCall: () => Promise<any>) => {
    setActionLoading(action);
    try {
      const response = await apiCall();
      if (response.success) {
        showNotification(`Crawler ${action} successfully`, 'success');
        await fetchStatus();
      } else {
        showNotification(`Failed to ${action} crawler: ${response.error}`, 'error');
      }
    } catch (error: unknown) {
      showNotification(`Failed to ${action} crawler: ${(error as Error).message || String(error)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [fetchStatus, showNotification]);

  const handleStart = () => handleAction('start', apiService.startCrawler);
  const handleStop = () => handleAction('stop', apiService.stopCrawler);
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the crawler? This will clear all queues and data.')) {
      handleAction('reset', () => apiService.resetCrawler({ redis_all: true }));
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? `${d}d ` : ''}${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m ` : ''}${s}s`;
  };

  const isRunning = status?.crawler_running ?? false;

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-7 h-7 text-sky-500" />
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>Crawler Controls</h2>
        </div>
        <Link
          to="/settings"
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${isDarkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Settings className="w-4 h-4" />
          <span>Configure</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`${isDarkMode ? 'bg-zinc-800/50' : 'bg-slate-50/80'} rounded-xl p-4 flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isRunning ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div>
                <div className={`text-sm font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Status</div>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{isRunning ? 'Running' : 'Stopped'}</p>
            </div>
        </div>
        <div className={`${isDarkMode ? 'bg-zinc-800/50' : 'bg-slate-50/80'} rounded-xl p-4 flex items-center gap-4`}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-sky-500/20 text-sky-500"><Clock className="w-6 h-6" /></div>
            <div>
                <div className={`text-sm font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Uptime</div>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{formatUptime(uptime)}</p>
            </div>
        </div>
        <div className={`${isDarkMode ? 'bg-zinc-800/50' : 'bg-slate-50/80'} rounded-xl p-4 flex items-center gap-4`}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-500"><Zap className="w-6 h-6" /></div>
            <div>
                <div className={`text-sm font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Pages/Sec</div>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{(status?.avg_pages_per_second ?? 0).toFixed(2)}</p>
            </div>
        </div>
        <div className="flex items-center justify-end gap-3">
            <button
                onClick={handleStart}
                disabled={isRunning || !!actionLoading}
                className="w-12 h-12 flex items-center justify-center bg-green-500 text-white rounded-full hover:bg-green-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 active:scale-95 shadow-lg hover:shadow-green-500/50"
                title="Start Crawler"
            >
                {actionLoading === 'start' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            </button>
            <button
                onClick={handleStop}
                disabled={!isRunning || !!actionLoading}
                className="w-12 h-12 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 active:scale-95 shadow-lg hover:shadow-red-500/50"
                title="Stop Crawler"
            >
                {actionLoading === 'stop' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" />}
            </button>
            <button
                onClick={handleReset}
                disabled={!!actionLoading}
                className="w-12 h-12 flex items-center justify-center bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 active:scale-95 shadow-lg hover:shadow-orange-500/50"
                title="Reset Crawler"
            >
                {actionLoading === 'reset' ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
            </button>
        </div>
      </div>
    </Card>
  );
};
