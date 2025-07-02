import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Play, Pause, Trash2, XCircle } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { apiService } from '../services/api';
import type { ScheduledJob, NextRun } from '../types';
import { useDashboard } from '../contexts/DashboardContext';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (job: Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

interface ScheduledJobsResponse {
  scheduled_jobs: ScheduledJob[];
  count: number;
}

interface NextRunsResponse {
  next_runs: NextRun[];
  count: number;
}

const CreateJobModal: React.FC<CreateJobModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { isDarkMode } = useDashboard();
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    schedule: '0 2 * * *', // Daily at 2 AM
    priority: 'medium' as const,
    category: 'General',
    urls: [''],
    config: {
      workers: 2,
      max_depth: 3,
      max_pages: 1000,
      delay: 1.0,
      timeout: 30,
      user_agent: 'WebCrawler/1.0'
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      status: 'enabled',
      nextRun: new Date().toISOString(),
      urls: formData.urls.filter(url => url.trim()),
      config: formData.config
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-stone-800' : 'bg-white'} rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>Create Scheduled Job</h2>
          <button onClick={onClose} className={`${isDarkMode ? 'text-stone-400 hover:text-stone-200' : 'text-gray-500 hover:text-gray-700'}`}>
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-1`}>
                Job Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'border-stone-600 bg-stone-700 text-stone-100' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="Daily Crawl"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-1`}>
                Domain
              </label>
              <input
                type="text"
                required
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'border-stone-600 bg-stone-700 text-stone-100' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="example.com"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-1`}>
                Schedule (Cron)
              </label>
              <input
                type="text"
                required
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'border-stone-600 bg-stone-700 text-stone-100' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="0 2 * * *"
              />
              <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>
                Format: minute hour day month weekday
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-1`}>
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'high' | 'medium' | 'low' })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'border-stone-600 bg-stone-700 text-stone-100' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-1`}>
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'border-stone-600 bg-stone-700 text-stone-100' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="General"
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-1`}>
              Starting URLs
            </label>
            {formData.urls.map((url, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const newUrls = [...formData.urls];
                    newUrls[index] = e.target.value;
                    setFormData({ ...formData, urls: newUrls });
                  }}
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'border-stone-600 bg-stone-700 text-stone-100' 
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="https://example.com"
                />
                {formData.urls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newUrls = formData.urls.filter((_, i) => i !== index);
                      setFormData({ ...formData, urls: newUrls });
                    }}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, urls: [...formData.urls, ''] })}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add URL
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-1`}>
                Workers
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.config.workers}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, workers: parseInt(e.target.value) }
                })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'border-stone-600 bg-stone-700 text-stone-100' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-1`}>
                Max Depth
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.config.max_depth}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, max_depth: parseInt(e.target.value) }
                })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'border-stone-600 bg-stone-700 text-stone-100' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-1`}>
                Max Pages
              </label>
              <input
                type="number"
                min="1"
                value={formData.config.max_pages}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, max_pages: parseInt(e.target.value) }
                })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'border-stone-600 bg-stone-700 text-stone-100' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Scheduler: React.FC = () => {
  const { isDarkMode } = useDashboard();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const scheduledJobsApi = useApi<ScheduledJobsResponse>();
  const nextRunsApi = useApi<NextRunsResponse>();
  const { showNotification } = useDashboard();

  const fetchScheduledJobs = React.useCallback(async () => {
    await scheduledJobsApi.execute(() => apiService.getScheduledJobs());
  }, [scheduledJobsApi]);

  const fetchNextRuns = React.useCallback(async () => {
    await nextRunsApi.execute(() => apiService.getNextRuns());
  }, [nextRunsApi]);

  useEffect(() => {
    fetchScheduledJobs();
    fetchNextRuns();
    const interval = setInterval(() => {
      fetchScheduledJobs();
      fetchNextRuns();
    }, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchScheduledJobs, fetchNextRuns]);

  const handleCreateJob = React.useCallback(async (job: Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt'>) => {
    const response = await apiService.createScheduledJob(job);
    if (response.success) {
      showNotification('Scheduled job created successfully', 'success');
      fetchScheduledJobs();
    } else {
      showNotification(`Failed to create scheduled job: ${response.error}`, 'error');
    }
  }, [fetchScheduledJobs, showNotification]);

  const handleEnableJob = React.useCallback(async (id: string) => {
    const response = await apiService.enableScheduledJob(id);
    if (response.success) {
      showNotification('Scheduled job enabled successfully', 'success');
      fetchScheduledJobs();
    } else {
      showNotification(`Failed to enable scheduled job: ${response.error}`, 'error');
    }
  }, [fetchScheduledJobs, showNotification]);

  const handleDisableJob = React.useCallback(async (id: string) => {
    const response = await apiService.disableScheduledJob(id);
    if (response.success) {
      showNotification('Scheduled job disabled successfully', 'success');
      fetchScheduledJobs();
    } else {
      showNotification(`Failed to disable scheduled job: ${response.error}`, 'error');
    }
  }, [fetchScheduledJobs, showNotification]);

  const handleDeleteJob = React.useCallback(async (id: string) => {
    const response = await apiService.deleteScheduledJob(id);
    if (response.success) {
      showNotification('Scheduled job deleted successfully', 'success');
      fetchScheduledJobs();
    } else {
      showNotification(`Failed to delete scheduled job: ${response.error}`, 'error');
    }
  }, [fetchScheduledJobs, showNotification]);

  const getStatusColor = (status: string) => {
    if (isDarkMode) {
      switch (status) {
        case 'enabled':
          return 'bg-green-900/50 text-green-300';
        case 'disabled':
          return 'bg-yellow-900/50 text-yellow-300';
        case 'running':
          return 'bg-blue-900/50 text-blue-300';
        case 'failed':
          return 'bg-red-900/50 text-red-300';
        default:
          return 'bg-stone-700 text-stone-300';
      }
    } else {
      switch (status) {
        case 'enabled':
          return 'bg-green-100 text-green-800';
        case 'disabled':
          return 'bg-yellow-100 text-yellow-800';
        case 'running':
          return 'bg-blue-100 text-blue-800';
        case 'failed':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    if (isDarkMode) {
      switch (priority) {
        case 'high':
          return 'bg-red-900/50 text-red-300';
        case 'medium':
          return 'bg-yellow-900/50 text-yellow-300';
        case 'low':
          return 'bg-green-900/50 text-green-300';
        default:
          return 'bg-stone-700 text-stone-300';
      }
    } else {
      switch (priority) {
        case 'high':
          return 'bg-red-100 text-red-800';
        case 'medium':
          return 'bg-yellow-100 text-yellow-800';
        case 'low':
          return 'bg-green-100 text-green-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>Job Scheduler</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Scheduled Job
          </button>
        </div>

        {scheduledJobsApi.loading && !scheduledJobsApi.data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border animate-pulse`}>
                <div className={`h-4 ${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} rounded w-3/4 mb-2`}></div>
                <div className={`h-6 ${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} rounded w-1/2 mb-4`}></div>
                <div className={`h-2 ${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} rounded w-full mb-2`}></div>
                <div className={`h-2 ${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} rounded w-2/3`}></div>
              </div>
            ))}
          </div>
        )}

        {scheduledJobsApi.error && (
          <div className={`${isDarkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
            <p className={isDarkMode ? 'text-red-200' : 'text-red-800'}>
              Error loading scheduled jobs: {scheduledJobsApi.error}
            </p>
            <button
              onClick={fetchScheduledJobs}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!scheduledJobsApi.loading && !scheduledJobsApi.error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {scheduledJobsApi.data?.scheduled_jobs?.map((job) => (
              <div key={job.id} className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border hover:shadow-md transition-shadow`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-1`}>{job.name}</h3>
                    <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-stone-400' : 'text-gray-600'} mb-2`}>
                      <Calendar className="w-4 h-4" />
                      <span>{job.domain}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(job.priority)}`}>
                        {job.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {job.status === 'enabled' ? (
                      <button
                        onClick={() => handleDisableJob(job.id)}
                        className={`p-2 text-yellow-600 ${isDarkMode ? 'hover:bg-yellow-900/50' : 'hover:bg-yellow-50'} rounded-lg transition-colors`}
                        title="Disable"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnableJob(job.id)}
                        className={`p-2 text-green-600 ${isDarkMode ? 'hover:bg-green-900/50' : 'hover:bg-green-50'} rounded-lg transition-colors`}
                        title="Enable"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className={`p-2 text-red-600 ${isDarkMode ? 'hover:bg-red-900/50' : 'hover:bg-red-50'} rounded-lg transition-colors`}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className={isDarkMode ? 'text-stone-400' : 'text-gray-600'}>Schedule:</span>
                    <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'}`}>{job.schedule}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className={isDarkMode ? 'text-stone-400' : 'text-gray-600'}>Next Run:</span>
                    <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'}`}>
                      {new Date(job.nextRun).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className={isDarkMode ? 'text-stone-400' : 'text-gray-600'}>Category:</span>
                    <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'}`}>{job.category}</span>
                  </div>

                  <div className="text-xs text-gray-500">
                    Created: {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!scheduledJobsApi.loading && !scheduledJobsApi.error && scheduledJobsApi.data?.scheduled_jobs?.length === 0 && (
          <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-12 rounded-lg border text-center`}>
            <h3 className={`text-lg font-medium ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-2`}>No scheduled jobs</h3>
            <p className={`${isDarkMode ? 'text-stone-400' : 'text-gray-500'} mb-6`}>Create your first scheduled job to get started.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create Scheduled Job
            </button>
          </div>
        )}
      </div>

      <CreateJobModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateJob}
      />
    </div>
  );
}; 