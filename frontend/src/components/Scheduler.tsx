import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Calendar, Play, Pause, Loader2, AlertTriangle } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import { useApi } from '../hooks/useApi';
import { apiService } from '../services/api';
import type { ScheduledJob } from '../types';

interface ScheduledJobsResponse {
  scheduled_jobs: ScheduledJob[];
  count: number;
}

const Scheduler: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showNotification } = useDashboard();
  
  const { data, loading, error, execute } = useApi<ScheduledJobsResponse>();

  const fetchJobs = useCallback(async () => {
    await execute(() => apiService.getScheduledJobs());
  }, [execute]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCreateJob = async (jobData: Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await apiService.createScheduledJob(jobData);
      if (response.success) {
        showNotification('Scheduled job created successfully', 'success');
        setShowCreateModal(false);
        fetchJobs();
      } else {
        showNotification('Failed to create scheduled job', 'error');
      }
    } catch (error) {
      showNotification('Failed to create scheduled job', 'error');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    setDeleting(true);
    try {
      const response = await apiService.deleteScheduledJob(jobId);
      if (response.success) {
        showNotification('Scheduled job deleted successfully', 'success');
        setShowDeleteModal(false);
        setSelectedJobId(null);
        fetchJobs();
      } else {
        showNotification('Failed to delete scheduled job', 'error');
      }
    } catch (error) {
      showNotification('Failed to delete scheduled job', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleJob = async (jobId: string, enabled: boolean) => {
    try {
      const response = enabled 
        ? await apiService.enableScheduledJob(jobId)
        : await apiService.disableScheduledJob(jobId);
      
      if (response.success) {
        showNotification(`Scheduled job ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
        fetchJobs();
      } else {
        showNotification(`Failed to ${enabled ? 'enable' : 'disable'} scheduled job`, 'error');
      }
    } catch (error) {
      showNotification(`Failed to ${enabled ? 'enable' : 'disable'} scheduled job`, 'error');
    }
  };

  const openDeleteModal = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowDeleteModal(true);
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
        <p className="text-red-800">Error loading scheduled jobs: {error}</p>
      </div>
    );
  }

  const jobs = data?.scheduled_jobs || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Scheduled Jobs</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Scheduled Job</span>
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No scheduled jobs found. Create your first scheduled job to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job: ScheduledJob) => {
            const statusConfig = {
              enabled: { color: 'green', icon: <Play/>, text: 'Enabled' },
              disabled: { color: 'gray', icon: <Pause/>, text: 'Disabled' },
              running: { color: 'blue', icon: <Loader2/>, text: 'Running' },
              completed: { color: 'green', icon: <Play/>, text: 'Completed' },
              failed: { color: 'red', icon: <AlertTriangle/>, text: 'Failed' },
            }[job.status] || { color: 'gray', icon: <Pause/>, text: 'Unknown' };

            return (
              <div key={job.id} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{job.name}</h3>
                    <p className="text-sm text-gray-600">{job.domain}</p>
                  </div>
                  <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-${statusConfig.color}-500/10 text-${statusConfig.color}-500`}>
                    {React.cloneElement(statusConfig.icon, { className: 'w-3 h-3' })}
                    <span>{statusConfig.text}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Schedule: {job.schedule}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Priority: {job.priority}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Category: {job.category}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => handleToggleJob(job.id, job.status === 'disabled')}
                    className={`px-3 py-1 rounded text-sm ${
                      job.status === 'disabled' 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-gray-500 text-white hover:bg-gray-600'
                    }`}
                  >
                    {job.status === 'disabled' ? 'Enable' : 'Disable'}
                  </button>
                  <button
                    onClick={() => openDeleteModal(job.id)}
                    className="px-3 py-1 rounded text-sm bg-red-500 text-white hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
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
          loading={deleting}
        />
      )}
    </div>
  );
};

// Placeholder components
const CreateJobModal = ({ onClose, onCreated }: { onClose: () => void, onCreated: (jobData: Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt'>) => void }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Create Scheduled Job</h3>
        <p className="text-gray-600 mb-4">Modal implementation needed</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button onClick={() => onCreated({
            name: 'New Scheduled Job',
            domain: 'example.com',
            status: 'enabled',
            schedule: '0 2 * * *',
            nextRun: new Date().toISOString(),
            priority: 'medium',
            category: 'General',
            config: {},
            urls: []
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
        <h3 className="text-lg font-semibold mb-4">Delete Scheduled Job</h3>
        <p className="text-gray-600 mb-4">Are you sure you want to delete this scheduled job?</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(jobId)} 
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export { Scheduler }; 