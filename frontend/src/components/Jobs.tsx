import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { JobRow } from './JobRow';
import { useApi } from '../hooks/useApi';
import { apiService } from '../services/api';
import type { CrawlJob } from '../types';
import { useDashboard } from '../contexts/DashboardContext';
import { Plus, Search, Loader2, RefreshCw, ListFilter } from 'lucide-react';
import Card from './ui/Card';

interface JobsApiResponse {
  jobs: CrawlJob[];
  count: number;
}

export const Jobs: React.FC = React.memo(() => {
  const { isDarkMode, addNotification } = useDashboard();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CrawlJob | null>(null);
  
  const { data, loading, error, execute } = useApi<JobsApiResponse>(() => apiService.getJobs());

  const fetchJobs = useCallback(() => {
    execute();
  }, [execute]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleJobAction = useCallback(async (jobId: string, action: 'start' | 'stop' | 'pause' | 'resume') => {
    try {
      const apiMap = {
        start: apiService.startJob,
        stop: apiService.stopJob,
        pause: apiService.pauseJob,
        resume: apiService.resumeJob,
      };
      const response = await apiMap[action](jobId);
      if (response.success) {
        addNotification({ id: Date.now().toString(), message: `Job ${action}ed successfully.`, type: 'success', timestamp: new Date().toISOString() });
        fetchJobs();
      } else {
        addNotification({ id: Date.now().toString(), message: `Failed to ${action} job: ${response.error}`, type: 'error', timestamp: new Date().toISOString() });
      }
    } catch (err) {
      addNotification({ id: Date.now().toString(), message: `An error occurred while trying to ${action} the job.`, type: 'error', timestamp: new Date().toISOString() });
    }
  }, [fetchJobs, addNotification]);

  const handleDeleteJob = useCallback(async (jobId: string) => {
    setDeleting(true);
    try {
      await apiService.deleteJob(jobId);
      addNotification({ id: Date.now().toString(), message: 'Job deleted successfully.', type: 'success', timestamp: new Date().toISOString() });
      setDeleteJobId(null);
      fetchJobs();
    } catch (err) {
      addNotification({ id: Date.now().toString(), message: 'Failed to delete job.', type: 'error', timestamp: new Date().toISOString() });
    } finally {
      setDeleting(false);
    }
  }, [fetchJobs, addNotification]);

  const filteredJobs = useMemo(() => (data?.jobs || [])
    .filter(job => 
      (job.name.toLowerCase().includes(searchQuery.toLowerCase()) || job.domain.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filterStatus === 'all' || job.status === filterStatus)
    ), [data, searchQuery, filterStatus]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>Crawl Jobs</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            New Job
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-grow sm:flex-grow-0">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full sm:w-64 pl-11 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? 'bg-zinc-800/80 border-zinc-700' : 'bg-white/80 border-slate-300'}`}
          />
        </div>
        <div className="relative">
            <ListFilter className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} />
            <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`pl-11 pr-4 py-2.5 border rounded-lg focus:outline-none appearance-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? 'bg-zinc-800/80 border-zinc-700' : 'bg-white/80 border-slate-300'}`}
            >
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
                <option value="failed">Failed</option>
                <option value="queued">Queued</option>
            </select>
        </div>
        <button 
          onClick={fetchJobs}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 ${isDarkMode ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-500 font-semibold">Error loading jobs: {error}</p>
          <button onClick={fetchJobs} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Retry</button>
        </div>
      )}

      {!loading && !error && (
        filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onAction={handleJobAction}
                onDelete={() => setDeleteJobId(job.id)}
                onView={() => setSelectedJob(job)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>No jobs found</h3>
            <p className={`mb-6 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Try adjusting your filters or create a new job.</p>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 mx-auto">
              <Plus className="w-4 h-4" />
              Create New Job
            </button>
          </div>
        )
      )}

      {showCreateModal && <CreateJobModal onClose={() => setShowCreateModal(false)} onCreated={fetchJobs} />}
      {deleteJobId && <DeleteJobModal jobId={deleteJobId} onClose={() => setDeleteJobId(null)} onConfirm={handleDeleteJob} loading={deleting} />}
      {selectedJob && <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </Card>
  );
});

const JobCardSkeleton = () => {
  const { isDarkMode } = useDashboard();
  return (
    <div className={`p-5 rounded-xl border animate-pulse ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700/80' : 'bg-white/50 border-slate-200/80'}`}>
        <div className={`h-5 rounded w-3/4 mb-3 ${isDarkMode ? 'bg-zinc-700' : 'bg-slate-200'}`}></div>
        <div className={`h-4 rounded w-1/2 mb-5 ${isDarkMode ? 'bg-zinc-700' : 'bg-slate-200'}`}></div>
        <div className={`h-2 rounded w-full mb-2 ${isDarkMode ? 'bg-zinc-700' : 'bg-slate-200'}`}></div>
        <div className="flex justify-between items-center mt-4">
            <div className={`h-8 rounded w-20 ${isDarkMode ? 'bg-zinc-700' : 'bg-slate-200'}`}></div>
            <div className={`h-8 rounded-full w-8 ${isDarkMode ? 'bg-zinc-700' : 'bg-slate-200'}`}></div>
        </div>
    </div>
  );
};

// Modals would be in their own files in a real app
const CreateJobModal = ({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) => {
    // ... modal implementation
    return <div>Create Job Modal</div>
}

const DeleteJobModal = ({ jobId, onClose, onConfirm, loading }: { jobId: string, onClose: () => void, onConfirm: (jobId: string) => void, loading: boolean }) => {
    // ... modal implementation
    return <div>Delete Job Modal</div>
}

const JobDetailsModal = ({ job, onClose }: { job: CrawlJob, onClose: () => void }) => {
    // ... modal implementation
    return <div>Job Details Modal</div>
}
 