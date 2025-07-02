import React, { useState, useEffect } from 'react';
import { JobRow } from './JobRow';
import { useApi } from '../hooks/useApi';
import { apiService } from '../services/api';
import type { CrawlJob } from '../types';
import { useDashboard } from '../contexts/DashboardContext';
import { Plus, Search, Loader2 } from 'lucide-react';

interface JobsApiResponse {
  jobs: CrawlJob[];
  count: number;
}

interface JobsProps {
  onRefresh?: () => void;
}

export const Jobs: React.FC<JobsProps> = React.memo(({ onRefresh }) => {
  const { isDarkMode } = useDashboard();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedJob, setSelectedJob] = useState<CrawlJob | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const jobsApi = useApi<JobsApiResponse>();
  const createJobApi = useApi<CrawlJob>();

  const { execute: jobsApiExecute } = jobsApi;

  const fetchJobs = React.useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.append('status', filterStatus);
    if (filterPriority !== 'all') params.append('priority', filterPriority);
    params.append('limit', '100');

    await jobsApiExecute(() => apiService.getJobs());
    setInitialLoading(false);
  }, [filterStatus, filterPriority, jobsApiExecute]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Timer effect: update currentTime every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = React.useCallback(() => {
    fetchJobs();
    onRefresh?.();
  }, [onRefresh, fetchJobs]);

  const handleCreateJob = React.useCallback(async (jobData: Omit<CrawlJob, 'id'>) => {
    const response = await createJobApi.execute(() => apiService.createJob(jobData));
    if (response.success) {
      setShowCreateModal(false);
      fetchJobs();
    }
  }, [createJobApi, fetchJobs]);

  const handleJobAction = React.useCallback(async (jobId: string, action: 'start' | 'stop' | 'pause' | 'resume') => {
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
  }, [fetchJobs]);

  const handleDeleteJob = React.useCallback(async (jobId: string) => {
    setDeleting(true);
    await apiService.deleteJob(jobId);
    setDeleting(false);
    setDeleteJobId(null);
    fetchJobs();
  }, [fetchJobs]);

  // Filtering logic
  const filteredJobs = React.useMemo(() => (jobsApi.data?.jobs || [])
    .filter(job => {
      const matchesSearch =
        job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.domain.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || job.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    }), [jobsApi.data, searchQuery, filterStatus, filterPriority]);

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

        {initialLoading && jobsApi.loading && !jobsApi.data && (
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

        {!jobsApi.error && (jobsApi.data || !jobsApi.loading) && (
          filteredJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y rounded-lg shadow ${isDarkMode ? 'bg-stone-800 divide-stone-700' : 'bg-white divide-gray-200'}`}>
                <thead className={isDarkMode ? 'bg-stone-700' : 'bg-gray-100'}>
                  <tr>
                    <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Name</th>
                    <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Domain</th>
                    <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Status</th>
                    <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Elapsed</th>
                    <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Progress</th>
                    <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Pages Crawled</th>
                    <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Errors</th>
                    <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Priority</th>
                    <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}>Actions</th>
                    <th className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-stone-300' : 'text-gray-600'}`}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job, idx) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      isDarkMode={isDarkMode}
                      idx={idx}
                      deleting={deleting}
                      onJobAction={handleJobAction}
                      onSetDeleteJobId={setDeleteJobId}
                      onSetSelectedJob={setSelectedJob}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
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
          )
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

        {/* Job Details Modal */}
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className={`rounded-lg shadow-xl p-8 w-full max-w-lg ${isDarkMode ? 'bg-stone-800 border border-stone-700' : 'bg-white border border-gray-200'}`}> 
              <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>Job Details</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">Name:</span> {selectedJob.name}</div>
                <div><span className="font-semibold">Domain:</span> {selectedJob.domain}</div>
                <div><span className="font-semibold">Status:</span> {selectedJob.status}</div>
                <div><span className="font-semibold">Priority:</span> {selectedJob.priority}</div>
                <div><span className="font-semibold">Category:</span> {selectedJob.category}</div>
                <div><span className="font-semibold">Elapsed:</span> {(() => {
                  let elapsed = '-';
                  if (selectedJob.startTime) {
                    const start = new Date(selectedJob.startTime).getTime();
                    let end = currentTime;
                    if (selectedJob.status === 'completed' && selectedJob.estimatedEnd) {
                      end = new Date(selectedJob.estimatedEnd).getTime();
                    }
                    const diff = Math.max(0, Math.floor((end - start) / 1000));
                    const h = Math.floor(diff / 3600);
                    const m = Math.floor((diff % 3600) / 60);
                    const s = diff % 60;
                    elapsed = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                  }
                  return elapsed;
                })()}</div>
                <div><span className="font-semibold">Pages Crawled:</span> {selectedJob.pagesFound}</div>
                <div><span className="font-semibold">Errors:</span> {selectedJob.errors}</div>
                <div><span className="font-semibold">Progress:</span> {selectedJob.progress.toFixed(1)}%</div>
                <div><span className="font-semibold">Data Size:</span> {selectedJob.dataSize}</div>
                <div><span className="font-semibold">Avg Response Time:</span> {selectedJob.avgResponseTime}</div>
                <div><span className="font-semibold">Success Rate:</span> {selectedJob.successRate}%</div>
                <div><span className="font-semibold">Start Time:</span> {selectedJob.startTime ? new Date(selectedJob.startTime).toLocaleString() : '-'}</div>
                <div><span className="font-semibold">End Time:</span> {selectedJob.estimatedEnd ? new Date(selectedJob.estimatedEnd).toLocaleString() : '-'}</div>
                <div><span className="font-semibold">Max Pages:</span> {selectedJob.config?.max_pages ?? '-'}</div>
                <div><span className="font-semibold">Max Depth:</span> {selectedJob.config?.max_depth ?? '-'}</div>
                <div><span className="font-semibold">Allowed Domains:</span> {selectedJob.config?.allowed_domains?.join(', ') ?? '-'}</div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setSelectedJob(null)} className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-stone-700 text-stone-100 hover:bg-stone-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// Create Job Modal Component
interface CreateJobModalProps {
  onClose: () => void;
  onSubmit: (jobData: Omit<CrawlJob, 'id'>) => void;
  loading: boolean;
  error: string | null;
}

interface CreateJobFormData {
  name: string;
  domain: string;
  priority: CrawlJob['priority'];
  category: string;
  depth: number;
  max_pages: number;
  workers: number;
  urls: string[];
}

const CreateJobModal: React.FC<CreateJobModalProps> = ({ onClose, onSubmit, loading, error }) => {
  const [formData, setFormData] = useState<CreateJobFormData>({
    name: '',
    domain: '',
    priority: 'medium',
    category: '',
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
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as CrawlJob['priority'] }))}
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