import React, { useMemo } from 'react';
import { Play, Pause, Square, Trash2, AlertCircle, CheckCircle, Clock, FileText, AlertTriangle, TrendingUp, Globe } from 'lucide-react';
import type { CrawlJob } from '../types';
import { useDashboard } from '../contexts/DashboardContext';

interface JobCardProps {
  job: CrawlJob;
  onAction: (jobId: string, action: 'start' | 'stop' | 'pause' | 'resume') => void;
  onDelete: (jobId: string) => void;
  onView: (job: CrawlJob) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onAction, onDelete, onView }) => {
  const { isDarkMode } = useDashboard();
  
  const statusIndicator = useMemo(() => {
    const indicators = {
      running: { icon: <Play className="w-3 h-3" />, color: 'green', text: 'Running' },
      completed: { icon: <CheckCircle className="w-3 h-3" />, color: 'sky', text: 'Completed' },
      paused: { icon: <Pause className="w-3 h-3" />, color: 'yellow', text: 'Paused' },
      failed: { icon: <AlertCircle className="w-3 h-3" />, color: 'red', text: 'Failed' },
      queued: { icon: <Clock className="w-3 h-3" />, color: 'slate', text: 'Queued' },
    };
    return indicators[job.status] || indicators.queued;
  }, [job.status]);

  const handleAction = (e: React.MouseEvent, action: 'start' | 'stop' | 'pause' | 'resume') => {
    e.stopPropagation();
    onAction(job.id, action);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(job.id);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onView(job);
  }

  return (
    <div 
      onClick={handleView}
      className={`group relative p-5 rounded-xl border hover:border-sky-500 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer ${isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white'}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 truncate pr-10">{job.name}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400 mt-1">
            <Globe className="w-4 h-4" />
            <span>{job.domain}</span>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-${statusIndicator.color}-500/10 text-${statusIndicator.color}-500`}>
          {statusIndicator.icon}
          <span>{statusIndicator.text}</span>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
          <span>Progress</span>
          <span className="font-semibold">{job.progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all duration-500 ease-out ${job.status === 'failed' ? 'bg-red-500' : 'bg-sky-500'}`} style={{ width: `${job.progress}%` }}></div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-sky-500" />Pages: <span className="font-semibold text-slate-700 dark:text-zinc-200">{job.pages_found.toLocaleString()}</span></div>
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Errors: <span className="font-semibold text-red-500">{job.errors.toLocaleString()}</span></div>
          <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" />Rate: <span className="font-semibold text-slate-700 dark:text-zinc-200">{job.avg_response_time}</span></div>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-500" />Priority: <span className="font-semibold text-slate-700 dark:text-zinc-200 capitalize">{job.priority}</span></div>
        </div>
      </div>

      <div className="absolute top-4 right-4">
        <div className="relative">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {job.status === 'paused' && <button onClick={(e) => handleAction(e, 'resume')} className="p-2 text-green-500 hover:bg-green-500/10 rounded-full"><Play className="w-4 h-4" /></button>}
                {job.status === 'queued' && <button onClick={(e) => handleAction(e, 'start')} className="p-2 text-green-500 hover:bg-green-500/10 rounded-full"><Play className="w-4 h-4" /></button>}
                {(job.status === 'running' || job.status === 'paused') && <button onClick={(e) => handleAction(e, 'stop')} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"><Square className="w-4 h-4" /></button>}
                {job.status === 'running' && <button onClick={(e) => handleAction(e, 'pause')} className="p-2 text-yellow-500 hover:bg-yellow-500/10 rounded-full"><Pause className="w-4 h-4" /></button>}
                <button onClick={handleDelete} disabled={job.status === 'running'} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
            </div>
        </div>
      </div>
    </div>
  );
}; 