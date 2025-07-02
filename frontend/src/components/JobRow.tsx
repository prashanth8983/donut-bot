import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import type { CrawlJob } from '../types';

interface JobRowProps {
  job: CrawlJob;
  isDarkMode: boolean;
  idx: number;
  deleting: boolean;
  onJobAction: (jobId: string, action: 'start' | 'stop' | 'pause' | 'resume') => void;
  onSetDeleteJobId: (jobId: string | null) => void;
  onSetSelectedJob: (job: CrawlJob | null) => void;
}

export const JobRow: React.FC<JobRowProps> = React.memo(({
  job,
  isDarkMode,
  idx,
  deleting,
  onJobAction,
  onSetDeleteJobId,
  onSetSelectedJob,
}) => {
  const [elapsed, setElapsed] = useState('-');

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;

    const calculateElapsed = () => {
      if (!job.startTime) {
        return '-';
      }
      const start = new Date(job.startTime).getTime();
      const end = (job.status === 'completed' && job.estimatedEnd)
        ? new Date(job.estimatedEnd).getTime()
        : Date.now();

      const diff = Math.max(0, Math.floor((end - start) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (job.status === 'running') {
      timerId = setInterval(() => {
        setElapsed(calculateElapsed());
      }, 1000);
    } else {
      setElapsed(calculateElapsed());
    }

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [job.status, job.startTime, job.estimatedEnd]);


  return (
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
      <td className={`px-2 py-2 whitespace-nowrap ${isDarkMode ? 'text-stone-200' : ''}`}>{elapsed}</td>
      <td className={`px-2 py-2 whitespace-nowrap ${isDarkMode ? 'text-stone-200' : ''}`}>
        <div className="flex items-center gap-2">
          <span>{job.progress.toFixed(1)}%</span>
          <div className={`${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} w-24 rounded-full h-2`}>
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${job.progress}%` }}></div>
          </div>
        </div>
      </td>
      <td className="px-2 py-2 whitespace-nowrap">{typeof job.pagesFound === 'number' ? job.pagesFound.toLocaleString() : '-'}</td>
      <td className="px-2 py-2 whitespace-nowrap">{typeof job.errors === 'number' ? job.errors.toLocaleString() : '-'}</td>
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
            <button onClick={() => onJobAction(job.id, 'pause')} className={`p-1 ${isDarkMode ? 'text-yellow-300 hover:bg-yellow-900/30' : 'text-yellow-600 hover:bg-yellow-50'} rounded transition-colors`} title="Pause">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            </button>
          )}
          {job.status === 'paused' && (
            <button onClick={() => onJobAction(job.id, 'resume')} className={`p-1 ${isDarkMode ? 'text-green-300 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'} rounded transition-colors`} title="Resume">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21 5,3"/></svg>
            </button>
          )}
          {job.status === 'queued' && (
            <button onClick={() => onJobAction(job.id, 'start')} className={`p-1 ${isDarkMode ? 'text-green-300 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'} rounded transition-colors`} title="Start">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21 5,3"/></svg>
            </button>
          )}
          {(job.status === 'running' || job.status === 'paused') && (
            <button onClick={() => onJobAction(job.id, 'stop')} className={`p-1 ${isDarkMode ? 'text-red-300 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'} rounded transition-colors`} title="Stop">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>
            </button>
          )}
          <button
            onClick={() => onSetDeleteJobId(job.id)}
            className={`p-1 ${isDarkMode ? 'text-red-300 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'} rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            title={job.status === 'running' ? 'Stop the job before deleting' : 'Delete Job'}
            disabled={deleting || job.status === 'running'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        <button onClick={() => onSetSelectedJob(job)} className={`px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-blue-900/50 text-blue-200 hover:bg-blue-800' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}>Details</button>
      </td>
    </tr>
  );
});
