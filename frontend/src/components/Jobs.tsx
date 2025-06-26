import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2, Trash2 } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { apiService } from '../services/api';
import type { CrawlJob } from '../types';
import { useDashboard } from '../contexts/DashboardContext';

interface JobsApiResponse {
  jobs: CrawlJob[];
  count: number;
}

interface JobsProps {
  onRefresh?: () => void;
}

export const Jobs: React.FC<JobsProps> = ({ onRefresh }) => {
  const { isDarkMode } = useDashboard();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const jobsApi = useApi<JobsApiResponse>();
  const createJobApi = useApi<CrawlJob>();

  const fetchJobs = async () => {
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.append('status', filterStatus);
    if (filterPriority !== 'all') params.append('priority', filterPriority);
    params.append('limit', '100');

    await jobsApi.execute(() => apiService.getJobs());
  };

  useEffect(() => {
    fetchJobs();
  }, [filterStatus, filterPriority]);

  const handleRefresh = () => {
    fetchJobs();
    onRefresh?.();
  };

  const handleCreateJob = async (jobData: Omit<CrawlJob, 'id'>) => {
    const response = await createJobApi.execute(() => apiService.createJob(jobData));
    if (response.success) {
      setShowCreateModal(false);
      fetchJobs();
    }
  };

  const handleJobAction = async (jobId: string, action: 'start' | 'stop' | 'pause' | 'resume') => {
    let apiCall;
    switch (action) {
      case 'start':
        apiCall = () => apiService.startJob(jobId);
        break;
      case 'stop':
        apiCall = () => apiService.stopJob(jobId);
        break;
      case 'pause':
        apiCall = () => apiService.pauseJob(jobId);
        break;
      case 'resume':
        apiCall = () => apiService.resumeJob(jobId);
        break;
    }
    
    if (apiCall) {
      await apiCall();
      fetchJobs(); // Refresh the jobs list
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    setDeleting(true);
    await apiService.deleteJob(jobId);
    setDeleting(false);
    setDeleteJobId(null);
    fetchJobs();
  };

  // Filtering logic
  const filteredJobs = (jobsApi.data?.jobs || [])
    .filter(job => {
      const matchesSearch =
        job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.domain.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || job.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });

  return (
    <div className="space-y-6">
      <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>Crawl Jobs</h2>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Job
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-stone-400' : 'text-gray-400'} w-4 h-4`} />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 ${
                isDarkMode 
                  ? 'border-stone-600 bg-stone-700 text-stone-100 placeholder-stone-400' 
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            />
          </div>

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode 
                ? 'border-stone-600 bg-stone-700 text-stone-100' 
                : 'border-gray-300 bg-white text-gray-900'
            }`}
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
          </select>

          <select 
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode 
                ? 'border-stone-600 bg-stone-700 text-stone-100' 
                : 'border-gray-300 bg-white text-gray-900'
            }`}
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button 
            onClick={handleRefresh}
            disabled={jobsApi.loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
              isDarkMode 
                ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {jobsApi.loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {jobsApi.loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {jobsApi.loading && !jobsApi.data && (
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

        {jobsApi.error && (
          <div className={`${isDarkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
            <p className={isDarkMode ? 'text-red-200' : 'text-red-800'}>
              Error loading jobs: {jobsApi.error}
            </p>
            <button 
              onClick={handleRefresh}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!jobsApi.loading && !jobsApi.error && (
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y rounded-lg shadow ${isDarkMode ? 'bg-stone-800 divide-stone-700' : 'bg-white divide-gray-200'}`}> 
              <thead className={isDarkMode ? 'bg-stone-700' : 'bg-gray-100'}>
                <tr>
                  <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Name</th>
                  <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Domain</th>
                  <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Status</th>
                  <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Progress</th>
                  <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Priority</th>
                  <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job, idx) => (
                  <tr
                    key={job.id}
                    className={
                      isDarkMode
                        ? `${idx % 2 === 0 ? 'bg-stone-800' : 'bg-stone-700'} hover:bg-blue-900/30 transition`
                        : `${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`
                    }
                  >
                    <td className={`px-2 py-2 whitespace-nowrap font-medium ${isDarkMode ? 'text-stone-100' : ''}`}>{job.name}</td>
                    <td className={`px-2 py-2 whitespace-nowrap ${isDarkMode ? 'text-stone-200' : ''}`}>{job.domain}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === 'running'
                          ? isDarkMode
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-green-100 text-green-800'
                          : job.status === 'completed'
                          ? isDarkMode
                            ? 'bg-blue-900/50 text-blue-300'
                            : 'bg-blue-100 text-blue-800'
                          : job.status === 'paused'
                          ? isDarkMode
                            ? 'bg-yellow-900/50 text-yellow-300'
                            : 'bg-yellow-100 text-yellow-800'
                          : job.status === 'failed'
                          ? isDarkMode
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-red-100 text-red-800'
                          : isDarkMode
                          ? 'bg-stone-700 text-stone-300'
                          : 'bg-gray-100 text-gray-800'
                      }`}>{job.status}</span>
                    </td>
                    <td className={`px-2 py-2 whitespace-nowrap ${isDarkMode ? 'text-stone-200' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span>{job.progress}%</span>
                        <div className={`${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} w-24 rounded-full h-2`}>
                          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${job.progress}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.priority === 'high'
                          ? isDarkMode
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-red-100 text-red-800'
                          : job.priority === 'medium'
                          ? isDarkMode
                            ? 'bg-yellow-900/50 text-yellow-300'
                            : 'bg-yellow-100 text-yellow-800'
                          : isDarkMode
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-green-100 text-green-800'
                      }`}>{job.priority}</span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex gap-1">
                        {job.status === 'running' && (
                          <button onClick={() => handleJobAction(job.id, 'pause')} className={`p-1 ${isDarkMode ? 'text-yellow-300 hover:bg-yellow-900/30' : 'text-yellow-600 hover:bg-yellow-50'} rounded transition-colors`} title="Pause">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                          </button>
                        )}
                        {job.status === 'paused' && (
                          <button onClick={() => handleJobAction(job.id, 'resume')} className={`p-1 ${isDarkMode ? 'text-green-300 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'} rounded transition-colors`} title="Resume">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21 5,3"/></svg>
                          </button>
                        )}
                        {job.status === 'queued' && (
                          <button onClick={() => handleJobAction(job.id, 'start')} className={`p-1 ${isDarkMode ? 'text-green-300 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'} rounded transition-colors`} title="Start">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21 5,3"/></svg>
                          </button>
                        )}
                        {(job.status === 'running' || job.status === 'paused') && (
                          <button onClick={() => handleJobAction(job.id, 'stop')} className={`p-1 ${isDarkMode ? 'text-red-300 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'} rounded transition-colors`} title="Stop">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteJobId(job.id)}
                          className={`p-1 ${isDarkMode ? 'text-red-300 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'} rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={job.status === 'running' ? 'Stop the job before deleting' : 'Delete Job'}
                          disabled={deleting || job.status === 'running'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!jobsApi.loading && !jobsApi.error && filteredJobs.length === 0 && (
          <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-12 rounded-lg border text-center`}>
            <h3 className={`text-lg font-medium ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-2`}>No jobs found</h3>
            <p className={`${isDarkMode ? 'text-stone-400' : 'text-gray-500'} mb-6`}>Try adjusting your filters or search terms.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create New Job
            </button>
          </div>
        )}

        {/* Create Job Modal */}
        {showCreateModal && (
          <CreateJobModal 
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateJob}
            loading={createJobApi.loading}
            error={createJobApi.error}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deleteJobId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className={`rounded-lg shadow-xl p-6 w-full max-w-sm ${isDarkMode ? 'bg-stone-800 border border-stone-700' : 'bg-white border border-gray-200'}`}> 
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>Delete Job?</h3>
              <p className={isDarkMode ? 'text-stone-300' : 'text-gray-700'}>Are you sure you want to delete this job? This action cannot be undone.</p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setDeleteJobId(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteJob(deleteJobId)}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Create Job Modal Component
interface CreateJobModalProps {
  onClose: () => void;
  onSubmit: (jobData: Omit<CrawlJob, 'id'>) => void;
  loading: boolean;
  error: string | null;
}

const CreateJobModal: React.FC<CreateJobModalProps> = ({ onClose, onSubmit, loading, error }) => {
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    priority: 'medium' as const,
    category: 'General',
    depth: 3,
    max_pages: 1000,
    workers: 2,
    urls: [] as string[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      status: 'queued',
      progress: 0,
      pagesFound: 0,
      errors: 0,
      startTime: '',
      estimatedEnd: '',
      scheduled: false,
      dataSize: '0 MB',
      avgResponseTime: '0s',
      successRate: 0,
      config: {
        workers: formData.workers,
        max_depth: formData.depth,
        max_pages: formData.max_pages,
        allowed_domains: [formData.domain],
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create New Crawl Job</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="E.g., Product Catalog Crawler"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <input
                type="url"
                required
                value={formData.domain}
                onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="E-commerce"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Depth</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.depth}
                onChange={(e) => setFormData(prev => ({ ...prev, depth: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Pages</label>
              <input
                type="number"
                min="1"
                value={formData.max_pages}
                onChange={(e) => setFormData(prev => ({ ...prev, max_pages: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workers</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.workers}
                onChange={(e) => setFormData(prev => ({ ...prev, workers: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 