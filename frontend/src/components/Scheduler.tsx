import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, Play, Pause, Trash2, X, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { apiService } from '../services/api';
import type { ScheduledJob, CrawlerConfig } from '../types';
import { useDashboard } from '../contexts/DashboardContext';
import Card from './ui/Card';

interface ScheduledJobsResponse {
  scheduled_jobs: ScheduledJob[];
  count: number;
}

export const Scheduler: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data, loading, error, execute } = useApi<ScheduledJobsResponse>(apiService.getScheduledJobs);
  const { showNotification, isDarkMode } = useDashboard();

  const fetchJobs = useCallback(() => execute(), [execute]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleAction = async (action: 'enable' | 'disable' | 'delete', jobId: string) => {
    try {
      const apiMap = {
        enable: apiService.enableScheduledJob,
        disable: apiService.disableScheduledJob,
        delete: apiService.deleteScheduledJob,
      };
      const response = await apiMap[action](jobId);
      if (response.success) {
        showNotification(`Scheduled job ${action}d successfully`, 'success');
        fetchJobs();
      } else {
        showNotification(`Failed to ${action} job: ${response.error}`, 'error');
      }
    } catch (err) {
      showNotification(`An error occurred while attempting to ${action} the job.`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <Calendar className="w-7 h-7 text-sky-500" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">Job Scheduler</h2>
            </div>
            <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-md hover:shadow-lg"
            >
                <Plus className="w-5 h-5" />
                New Scheduled Job
            </button>
        </div>

        {loading && !data && <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500" /></div>}
        {error && 
            <div className="text-center py-8 text-red-500 flex flex-col items-center gap-2">
                <AlertTriangle className="w-8 h-8" />
                <p>Error: {error}</p>
                <button onClick={fetchJobs} className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Retry</button>
            </div>
        }
        
        {!loading && !error && (
            data?.scheduled_jobs.length === 0 ? (
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-slate-800 dark:text-zinc-100 mb-2">No scheduled jobs</h3>
                    <p className="text-slate-500 dark:text-zinc-400 mb-6">Create your first scheduled job to get started.</p>
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 mx-auto">
                        <Plus className="w-4 h-4" />
                        Create Scheduled Job
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {data?.scheduled_jobs.map((job) => <ScheduledJobCard key={job.id} job={job} onAction={handleAction} />)}
                </div>
            )
        )}
      </Card>

      {showCreateModal && <CreateJobModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={fetchJobs} />}
    </div>
  );
};

const ScheduledJobCard: React.FC<{ job: ScheduledJob, onAction: (action: 'enable' | 'disable' | 'delete', jobId: string) => void }> = ({ job, onAction }) => {
    const statusConfig = {
        enabled: { color: 'green', icon: <Play/>, text: 'Enabled' },
        disabled: { color: 'yellow', icon: <Pause/>, text: 'Disabled' },
        running: { color: 'blue', icon: <Loader2 className="animate-spin"/>, text: 'Running' },
        failed: { color: 'red', icon: <AlertTriangle/>, text: 'Failed' },
    }[job.status];

    return (
        <Card className="flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 pr-4">{job.name}</h3>
                    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-${statusConfig.color}-500/10 text-${statusConfig.color}-500`}>
                        {React.cloneElement(statusConfig.icon, { className: 'w-3 h-3' })}
                        <span>{statusConfig.text}</span>
                    </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">Domain: {job.domain}</p>
                <div className="text-sm space-y-2 text-slate-600 dark:text-zinc-300">
                    <p><strong>Schedule:</strong> <span className="font-mono">{job.schedule}</span></p>
                    <p><strong>Next Run:</strong> {new Date(job.nextRun).toLocaleString()}</p>
                    <p><strong>Last Run:</strong> {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}</p>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
                {job.status === 'enabled' ? (
                    <button onClick={() => onAction('disable', job.id)} className="px-3 py-1 text-sm font-semibold text-yellow-600 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-md">Disable</button>
                ) : (
                    <button onClick={() => onAction('enable', job.id)} className="px-3 py-1 text-sm font-semibold text-green-600 bg-green-500/20 hover:bg-green-500/30 rounded-md">Enable</button>
                )}
                <button onClick={() => onAction('delete', job.id)} className="px-3 py-1 text-sm font-semibold text-red-600 bg-red-500/20 hover:bg-red-500/30 rounded-md">Delete</button>
            </div>
        </Card>
    );
}

const CreateJobModal: React.FC<{ isOpen: boolean, onClose: () => void, onCreated: () => void }> = ({ isOpen, onClose, onCreated }) => {
    const [formData, setFormData] = useState<Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'nextRun' | 'lastRun'> & { urls_list: string }>({ 
        name: '', domain: '', schedule: '0 2 * * *', priority: 'medium', category: 'General', urls_list: '', config: {}
    });
    const [loading, setLoading] = useState(false);
    const { showNotification } = useDashboard();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const jobData = { ...formData, urls: formData.urls_list.split('\n').filter(Boolean) };
            delete (jobData as any).urls_list;
            const response = await apiService.createScheduledJob(jobData);
            if (response.success) {
                showNotification('Scheduled job created successfully', 'success');
                onCreated();
                onClose();
            } else {
                showNotification(`Failed to create job: ${response.error}`, 'error');
            }
        } catch (err) {
            showNotification(`An error occurred: ${(err as Error).message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">Create Scheduled Job</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"><X className="w-6 h-6 text-slate-500" /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {/* Form fields here */}
                    <button type="submit" disabled={loading} className="w-full mt-6 py-3 bg-sky-500 text-white rounded-lg font-semibold hover:bg-sky-600 disabled:opacity-50">
                        {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Create Job'}
                    </button>
                </form>
            </Card>
        </div>
    );
}; 