import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Plus, Trash2, Upload, AlertTriangle, Loader2, Link as LinkIcon, CheckCircle, XCircle } from 'lucide-react';
import { apiService } from '../services/api';
import type { QueueStatus } from '../types';
import { useDashboard } from '../contexts/DashboardContext';
import Card from './ui/Card';

export const UrlManager: React.FC = () => {
  const { showNotification, isDarkMode } = useDashboard();
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [newUrls, setNewUrls] = useState('');

  const fetchQueueStatus = useCallback(async () => {
    try {
      const response = await apiService.getQueueStatus();
      if (response.success) {
        setQueueStatus(response.data!);
      } else {
        showNotification('Failed to load queue status', 'error');
      }
    } catch (error) {
      showNotification('Failed to load queue status', 'error');
    }
  }, [showNotification]);

  useEffect(() => {
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchQueueStatus]);

  const { validUrls, invalidUrls } = useMemo(() => {
    const urls = newUrls.split('\n').map(url => url.trim()).filter(Boolean);
    const valid: string[] = [];
    const invalid: string[] = [];
    
    urls.forEach(url => {
      try {
        new URL(url);
        valid.push(url);
      } catch {
        invalid.push(url);
      }
    });
    
    return { validUrls: valid, invalidUrls: invalid };
  }, [newUrls]);

  const handleAddUrls = async () => {
    if (validUrls.length === 0) return;
    setLoading(true);
    try {
      const response = await apiService.addUrls(validUrls);
      if (response.success) {
        showNotification(`${validUrls.length} URLs added successfully`, 'success');
        setNewUrls('');
        fetchQueueStatus();
      } else {
        showNotification(`Failed to add URLs: ${response.error}`, 'error');
      }
    } catch (error: unknown) {
      showNotification(`Failed to add URLs: ${(error as Error).message || String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearUrls = async () => {
    if (!window.confirm('Are you sure you want to clear all URLs from the queue? This action cannot be undone.')) return;
    setLoading(true);
    try {
      const response = await apiService.clearUrls();
      if (response.success) {
        showNotification('All URLs cleared successfully', 'success');
        fetchQueueStatus();
      } else {
        showNotification(`Failed to clear URLs: ${response.error}`, 'error');
      }
    } catch (error: unknown) {
      showNotification(`Failed to clear URLs: ${(error as Error).message || String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setNewUrls(e.target?.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
            <div className="flex items-center gap-3 mb-6">
                <LinkIcon className="w-7 h-7 text-sky-500" />
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>Add URLs to Queue</h2>
            </div>
            <textarea
              value={newUrls}
              onChange={(e) => setNewUrls(e.target.value)}
              placeholder="https://example.com/page1\nhttps://example.com/page2"
              rows={8}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white/50 border-slate-300'}`}
            />
            <div className="flex flex-wrap items-center justify-between mt-4 gap-4">
                <div className="flex items-center gap-4 text-sm">
                    <div className={`flex items-center gap-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}><CheckCircle className="w-5 h-5" />{validUrls.length} valid</div>
                    <div className={`flex items-center gap-2 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}><XCircle className="w-5 h-5" />{invalidUrls.length} invalid</div>
                </div>
                <div className="flex gap-3">
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                        <Upload className="w-5 h-5" />
                        Upload
                        <input type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button
                        onClick={handleAddUrls}
                        disabled={loading || validUrls.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        Add URLs
                    </button>
                </div>
            </div>
        </Card>
      </div>
      <div>
        <Card>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>Queue Status</h3>
            <div className="space-y-3">
                <QueueStatItem label="In Queue" value={queueStatus?.queue_size} color="sky" isDarkMode={isDarkMode} />
                <QueueStatItem label="Processing" value={queueStatus?.processing_count} color="yellow" isDarkMode={isDarkMode} />
                <QueueStatItem label="Completed" value={queueStatus?.completed_count} color="green" isDarkMode={isDarkMode} />
                <QueueStatItem label="Seen" value={queueStatus?.seen_count} color="slate" isDarkMode={isDarkMode} />
            </div>
            <div className={`mt-6 border-t pt-4 ${isDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}><AlertTriangle className="w-5 h-5 text-red-500"/>Danger Zone</h4>
                <p className={`text-sm mb-3 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Clearing the queue will remove all pending URLs.</p>
                <button
                    onClick={handleClearUrls}
                    disabled={loading || !queueStatus || queueStatus.queue_size === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    Clear All URLs
                </button>
            </div>
        </Card>
      </div>
    </div>
  );
};

const QueueStatItem: React.FC<{label: string, value: number | undefined, color: string, isDarkMode: boolean}> = ({ label, value, color, isDarkMode }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg bg-${color}-500/10`}>
        <div className={`font-semibold ${isDarkMode ? `text-${color}-400` : `text-${color}-600`}`}>{label}</div>
        <div className={`text-lg font-bold ${isDarkMode ? `text-${color}-300` : `text-${color}-600`}`}>{(value ?? 0).toLocaleString()}</div>
    </div>
);
 