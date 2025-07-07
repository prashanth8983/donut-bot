import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Play, Pause, Square, Eye, MoreVertical, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { CrawlJob } from '../types';

interface JobRowProps {
  job: CrawlJob;
  isDarkMode: boolean;
  onJobAction: (jobId: string, action: 'start' | 'stop' | 'pause' | 'resume') => void;
  onSetDeleteJobId: (jobId: string | null) => void;
  onSetSelectedJob: (job: CrawlJob | null) => void;
  actionLoading: boolean;
}

export const JobRow: React.FC<JobRowProps> = ({ job, isDarkMode, onJobAction, onSetDeleteJobId, onSetSelectedJob, actionLoading }) => {
  const [elapsed, setElapsed] = useState('-');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const calculateElapsed = () => {
      if (!job.start_time) {
        setElapsed('-');
        return;
      }
      const start = new Date(job.start_time).getTime();
      if (isNaN(start)) {
        setElapsed('-');
        return;
      }

      const update = () => {
        let end;
        if (job.status === 'completed' || job.status === 'failed') {
            end = job.end_time ? new Date(job.end_time).getTime() : new Date().getTime();
        } else {
            end = new Date().getTime();
        }

        const diff = Math.max(0, Math.floor((end - start) / 1000));
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      };

      if (job.status === 'running') {
        update();
        interval = setInterval(update, 1000);
      } else {
        update();
      }
    };

    calculateElapsed();
    return () => clearInterval(interval);
  }, [job.status, job.start_time, job.end_time]);

  const statusIndicator = useMemo(() => {
    const indicators = {
      running: { icon: <Play className="w-3 h-3" />, color: 'green-500', text: 'Running' },
      completed: { icon: <CheckCircle className="w-3 h-3" />, color: 'sky-500', text: 'Completed' },
      paused: { icon: <Pause className="w-3 h-3" />, color: 'yellow-500', text: 'Paused' },
      failed: { icon: <AlertCircle className="w-3 h-3" />, color: 'red-500', text: 'Failed' },
      queued: { icon: <Clock className="w-3 h-3" />, color: 'slate-500', text: 'Queued' },
    };
    return indicators[job.status] || indicators.queued;
  }, [job.status]);

  return (
    <tr className={`border-b ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-800/50' : 'border-slate-200 hover:bg-slate-50/50'} transition-colors duration-200`}>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="font-bold text-slate-800 dark:text-zinc-100">{job.name}</div>
        <div className="text-sm text-slate-500 dark:text-zinc-400">{job.domain}</div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-${statusIndicator.color}/10 text-${statusIndicator.color}`}>
          {statusIndicator.icon}
          <span>{statusIndicator.text}</span>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600 dark:text-zinc-400">{elapsed}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-2">
          <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${job.progress}%` }}></div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-zinc-300">{job.pages_found.toLocaleString()}</td>
      <td className="px-4 py-3 whitespace-nowrap text-red-500">{job.errors.toLocaleString()}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="relative group">
            <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                <MoreVertical className="w-5 h-5 text-slate-500 dark:text-zinc-400" />
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg shadow-xl z-10 hidden group-hover:block">
                <button onClick={() => onSetSelectedJob(job)} className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700"><Eye className="w-4 h-4"/>View Details</button>
                {job.status === 'running' && <button onClick={() => onJobAction(job.id, 'pause')} disabled={actionLoading} className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-50"><Pause className="w-4 h-4 text-yellow-500"/>Pause</button>}
                {job.status === 'paused' && <button onClick={() => onJobAction(job.id, 'resume')} disabled={actionLoading} className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-50"><Play className="w-4 h-4 text-green-500"/>Resume</button>}
                {job.status === 'queued' && <button onClick={() => onJobAction(job.id, 'start')} disabled={actionLoading} className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-50"><Play className="w-4 h-4 text-green-500"/>Start</button>}
                {(job.status === 'running' || job.status === 'paused') && <button onClick={() => onJobAction(job.id, 'stop')} disabled={actionLoading} className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-50"><Square className="w-4 h-4 text-red-500"/>Stop</button>}
                <div className="border-t border-slate-200 dark:border-zinc-700 my-1"></div>
                <button onClick={() => onSetDeleteJobId(job.id)} disabled={actionLoading || job.status === 'running'} className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 disabled:opacity-50"><Trash2 className="w-4 h-4"/>Delete</button>
            </div>
        </div>
      </td>
    </tr>
  );
};

