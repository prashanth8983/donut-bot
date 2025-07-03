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
  currentTime: number;
  actionLoading: boolean;
}

export const JobRow: React.FC<JobRowProps> = ({
  job,
  isDarkMode,
  idx,
  deleting,
  onJobAction,
  onSetDeleteJobId,
  onSetSelectedJob,
  currentTime,
  actionLoading,
}) => {
  const [elapsed, setElapsed] = useState('-');

  useEffect(() => {
    const calculateAndSetElapsed = () => {
      // Debug logging
      console.log(`JobRow Debug - Job: ${job.name}, Status: ${job.status}, start_time: ${job.start_time}, end_time: ${job.end_time}`);
      
      if (!job.start_time) {
        console.log(`JobRow Debug - No start_time, setting elapsed to '-'`);
        setElapsed('-');
        return;
      }

      const start = new Date(job.start_time).getTime();
      if (isNaN(start)) {
        console.log(`JobRow Debug - Invalid start_time, setting elapsed to '-'`);
        setElapsed('-');
        return;
      }

      if (job.status === 'running') {
        const now = currentTime;
        const diff = Math.max(0, Math.floor((now - start) / 1000));
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        const elapsedStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        console.log(`JobRow Debug - Running job elapsed: ${elapsedStr} (diff: ${diff}s)`);
        setElapsed(elapsedStr);
      } else if (job.end_time) {
        const end = new Date(job.end_time).getTime();
        if (!isNaN(end)) {
          const diff = Math.max(0, Math.floor((end - start) / 1000));
          const h = Math.floor(diff / 3600);
          const m = Math.floor((diff % 3600) / 60);
          const s = diff % 60;
          const elapsedStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          console.log(`JobRow Debug - Completed/paused job elapsed: ${elapsedStr} (diff: ${diff}s)`);
          setElapsed(elapsedStr);
        } else {
          console.log(`JobRow Debug - Invalid end_time: ${job.end_time}, setting elapsed to '-'`);
          setElapsed('-');
        }
      } else {
        console.log(`JobRow Debug - No end_time for non-running job, setting elapsed to '-'`);
        setElapsed('-');
      }
    };

    calculateAndSetElapsed();
  }, [job.status, job.start_time, job.end_time, currentTime]);


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
          {(() => {
            let progress = typeof job.progress === 'number' && !isNaN(job.progress) ? job.progress : 0;
            progress = Math.max(0, Math.min(100, progress));
            return (
              <>
                <span>{progress.toFixed(1)}%</span>
                <div
                  className={`${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} w-24 rounded-full h-2`}
                  title={`Progress: ${progress.toFixed(1)}%`}
                  aria-label={`Progress: ${progress.toFixed(1)}%`}
                >
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </>
            );
          })()}
        </div>
      </td>
      <td className="px-2 py-2 whitespace-nowrap">{typeof job.pages_found === 'number' ? job.pages_found.toLocaleString() : '-'}</td>
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
            <button 
              onClick={() => onJobAction(job.id, 'pause')} 
              className={`p-1 ${isDarkMode ? 'text-yellow-300 hover:bg-yellow-900/30' : 'text-yellow-600 hover:bg-yellow-50'} rounded transition-colors ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`} 
              title="Pause" 
              disabled={actionLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            </button>
          )}
          {job.status === 'paused' && (
            <button 
              onClick={() => onJobAction(job.id, 'resume')} 
              className={`p-1 ${isDarkMode ? 'text-green-300 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'} rounded transition-colors ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`} 
              title="Resume" 
              disabled={actionLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21 5,3"/></svg>
            </button>
          )}
          {job.status === 'queued' && (
            <button 
              onClick={() => onJobAction(job.id, 'start')} 
              className={`p-1 ${isDarkMode ? 'text-green-300 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'} rounded transition-colors ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`} 
              title="Start" 
              disabled={actionLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21 5,3"/></svg>
            </button>
          )}
          {(job.status === 'running' || job.status === 'paused') && (
            <button 
              onClick={() => onJobAction(job.id, 'stop')} 
              className={`p-1 ${isDarkMode ? 'text-red-300 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'} rounded transition-colors ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`} 
              title="Stop" 
              disabled={actionLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>
            </button>
          )}
          <button
            onClick={() => onSetDeleteJobId(job.id)}
            className={`p-1 ${isDarkMode ? 'text-red-300 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'} rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            title={job.status === 'running' ? 'Stop the job before deleting' : 'Delete Job'}
            disabled={deleting || job.status === 'running' || actionLoading}
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
};
