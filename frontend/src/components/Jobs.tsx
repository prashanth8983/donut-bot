import React, { useState, useCallback, useEffect } from 'react';
import { JobCard } from './JobCard';
import { useDashboard } from '../contexts/DashboardContext';
import { useApi } from '../hooks/useApi';
import { apiService } from '../services/api';
import type { CrawlJob } from '../types';

interface JobsApiResponse {
  jobs: CrawlJob[];
  count: number;
}

const Jobs: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CrawlJob | null>(null);

  const { showNotification } = useDashboard();
  
  const { data, loading, error, execute } = useApi<JobsApiResponse>();

  const fetchJobs = useCallback(async () => {
    await execute(() => apiService.getJobs());
  }, [execute]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCreateJob = async (jobData: Omit<CrawlJob, 'id'>) => {
    try {
      await apiService.createJob(jobData);
      showNotification('Job created successfully', 'success');
      setShowCreateModal(false);
      fetchJobs();
    } catch (error) {
      showNotification('Failed to create job', 'error');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await apiService.deleteJob(jobId);
      showNotification('Job deleted successfully', 'success');
      setShowDeleteModal(false);
      setSelectedJobId(null);
      fetchJobs();
    } catch (error) {
      showNotification('Failed to delete job', 'error');
    }
  };

  const handleJobAction = async (jobId: string, action: 'start' | 'stop' | 'pause' | 'resume') => {
    try {
      const apiMap = {
        start: apiService.startJob,
        stop: apiService.stopJob,
        pause: apiService.pauseJob,
        resume: apiService.resumeJob,
      };
      await apiMap[action](jobId);
      showNotification(`Job ${action}ed successfully`, 'success');
      fetchJobs();
    } catch (error) {
      showNotification(`Failed to ${action} job`, 'error');
    }
  };

  const openDeleteModal = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowDeleteModal(true);
  };

  const openDetailsModal = (job: CrawlJob) => {
    setSelectedJob(job);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading jobs: {error}</p>
      </div>
    );
  }

  const jobs = data?.jobs || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Crawl Jobs</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <span>Create Job</span>
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No jobs found. Create your first job to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job: CrawlJob) => (
            <JobCard
              key={job.id}
              job={job}
              onAction={handleJobAction}
              onDelete={openDeleteModal}
              onView={openDetailsModal}
            />
          ))}
        </div>
      )}

      {/* Create Job Modal */}
      {showCreateModal && (
        <CreateJobModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreateJob}
        />
      )}

      {/* Delete Job Modal */}
      {showDeleteModal && selectedJobId && (
        <DeleteJobModal
          jobId={selectedJobId}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteJob}
          loading={loading}
        />
      )}

      {/* Job Details Modal */}
      {showDetailsModal && selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
};

// Placeholder components - these would need to be implemented
const CreateJobModal = ({ onClose, onCreated }: { onClose: () => void, onCreated: (jobData: Omit<CrawlJob, 'id'>) => void }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Create New Job</h3>
        <p className="text-gray-600 mb-4">Modal implementation needed</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button onClick={() => onCreated({
            name: 'New Job',
            domain: 'example.com',
            status: 'queued',
            progress: 0,
            pages_found: 0,
            errors: 0,
            start_time: null,
            end_time: null,
            max_depth: 3,
            max_pages: 100,
            scheduled: false,
            priority: 'medium',
            description: '',
            tags: [],
            data_size: '0 B',
            avg_response_time: '0ms',
            success_rate: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteJobModal = ({ jobId, onClose, onConfirm, loading }: { jobId: string, onClose: () => void, onConfirm: (jobId: string) => void, loading: boolean }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Delete Job</h3>
        <p className="text-gray-600 mb-4">Are you sure you want to delete this job?</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(jobId)} 
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const JobDetailsModal = ({ job, onClose }: { job: CrawlJob, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Job Details</h3>
        <div className="space-y-4">
          <div>
            <label className="font-medium">ID:</label>
            <p className="text-gray-600">{job.id}</p>
          </div>
          <div>
            <label className="font-medium">Status:</label>
            <p className="text-gray-600">{job.status}</p>
          </div>
          <div>
            <label className="font-medium">Created:</label>
            <p className="text-gray-600">{new Date(job.created_at).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export { Jobs };
 