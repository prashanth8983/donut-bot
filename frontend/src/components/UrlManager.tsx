import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, Upload, Download, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';
import type { QueueStatus } from '../types';
import { useDashboard } from '../contexts/DashboardContext';

export const UrlManager: React.FC = () => {
  const { showNotification, isDarkMode } = useDashboard();
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [newUrls, setNewUrls] = useState('');
  const [adding, setAdding] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchQueueStatus = async () => {
    try {
      const response = await apiService.getQueueStatus();
      if (response.success) {
        setQueueStatus(response.data || null);
      }
    } catch (error) {
      console.error('Failed to fetch queue status:', error);
    }
  };

  const handleAddUrls = async () => {
    if (!newUrls.trim()) return;

    const urls = newUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) {
      showNotification('Please enter at least one valid URL', 'error');
      return;
    }

    setAdding(true);
    try {
      const response = await apiService.addUrls(urls);
      if (response.success) {
        showNotification(`${urls.length} URLs added successfully`, 'success');
        setNewUrls('');
        fetchQueueStatus();
      } else {
        showNotification(`Failed to add URLs: ${response.error}`, 'error');
      }
    } catch (error) {
      showNotification('Failed to add URLs', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleClearUrls = async () => {
    if (!window.confirm('Are you sure you want to clear all URLs from the queue? This action cannot be undone.')) {
      return;
    }

    setClearing(true);
    try {
      const response = await apiService.clearUrls();
      if (response.success) {
        showNotification('All URLs cleared successfully', 'success');
        fetchQueueStatus();
      } else {
        showNotification(`Failed to clear URLs: ${response.error}`, 'error');
      }
    } catch (error) {
      showNotification('Failed to clear URLs', 'error');
    } finally {
      setClearing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setNewUrls(content);
    };
    reader.readAsText(file);
  };

  const downloadUrls = () => {
    if (!newUrls.trim()) return;

    const blob = new Blob([newUrls], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'urls.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getUrlCount = () => {
    return newUrls.split('\n').filter(url => url.trim().length > 0).length;
  };

  const getInvalidUrls = () => {
    return newUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0 && !validateUrl(url));
  };

  const invalidUrls = getInvalidUrls();

  return (
    <div className="space-y-6">
      {/* Queue Status */}
      <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
          <Eye className="w-5 h-5" />
          Queue Status
        </h2>
        
        {queueStatus ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-50'} rounded-lg p-4`}>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                {queueStatus.queue_size.toLocaleString()}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>In Queue</div>
            </div>
            
            <div className={`${isDarkMode ? 'bg-yellow-900/50' : 'bg-yellow-50'} rounded-lg p-4`}>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                {queueStatus.processing_urls.toLocaleString()}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>Processing</div>
            </div>
            
            <div className={`${isDarkMode ? 'bg-green-900/50' : 'bg-green-50'} rounded-lg p-4`}>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                {queueStatus.completed_urls.toLocaleString()}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-green-200' : 'text-green-700'}`}>Completed</div>
            </div>
            
            <div className={`${isDarkMode ? 'bg-stone-700' : 'bg-gray-50'} rounded-lg p-4`}>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>
                {queueStatus.seen_urls.toLocaleString()}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-gray-700'}`}>Seen</div>
            </div>
          </div>
        ) : (
          <div className={isDarkMode ? 'text-stone-400' : 'text-gray-500'}>Loading queue status...</div>
        )}
      </div>

      {/* Add URLs */}
      <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
          <Plus className="w-5 h-5" />
          Add URLs
        </h2>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
              URLs (one per line)
            </label>
            <textarea
              value={newUrls}
              onChange={(e) => setNewUrls(e.target.value)}
              placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
              rows={6}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'border-stone-600 bg-stone-700 text-stone-100 placeholder-stone-400' 
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            />
            <div className="flex justify-between items-center mt-2">
              <span className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                {getUrlCount()} URLs ready to add
              </span>
              {invalidUrls.length > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{invalidUrls.length} invalid URLs</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAddUrls}
              disabled={adding || getUrlCount() === 0 || invalidUrls.length > 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {adding ? 'Adding...' : 'Add URLs'}
            </button>

            <label className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload File
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={downloadUrls}
              disabled={!newUrls.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Queue Management */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Queue Management
        </h2>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">Danger Zone</span>
          </div>
          <p className="text-sm text-red-700 mb-3">
            Clearing the queue will remove all pending URLs. This action cannot be undone.
          </p>
          <button
            onClick={handleClearUrls}
            disabled={clearing || !queueStatus || queueStatus.queue_size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {clearing ? 'Clearing...' : 'Clear All URLs'}
          </button>
        </div>
      </div>

      {/* URL Validation */}
      {invalidUrls.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Invalid URLs</span>
          </div>
          <div className="space-y-1">
            {invalidUrls.map((url, index) => (
              <div key={index} className="text-sm text-yellow-700 font-mono">
                {url}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 