import React from 'react';
import { Play, Square, Pause,  Clock, Globe, BarChart3 } from 'lucide-react';
import type { CrawlJob } from '../types';
import { useDashboard } from '../contexts/DashboardContext';

interface JobCardProps {
  job: CrawlJob;
  onAction: (action: 'start' | 'stop' | 'pause' | 'resume') => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onAction }) => {
  const { isDarkMode } = useDashboard();
  
  const getStatusColor = (status: string) => {
    if (isDarkMode) {
      switch (status) {
        case 'running':
          return 'bg-green-900/50 text-green-300';
        case 'completed':
          return 'bg-blue-900/50 text-blue-300';
        case 'paused':
          return 'bg-yellow-900/50 text-yellow-300';
        case 'failed':
          return 'bg-red-900/50 text-red-300';
        case 'queued':
          return 'bg-stone-700 text-stone-300';
        default:
          return 'bg-stone-700 text-stone-300';
      }
    } else {
      switch (status) {
        case 'running':
          return 'bg-green-100 text-green-800';
        case 'completed':
          return 'bg-blue-100 text-blue-800';
        case 'paused':
          return 'bg-yellow-100 text-yellow-800';
        case 'failed':
          return 'bg-red-100 text-red-800';
        case 'queued':
          return 'bg-gray-100 text-gray-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    if (isDarkMode) {
      switch (priority) {
        case 'high':
          return 'bg-red-900/50 text-red-300';
        case 'medium':
          return 'bg-yellow-900/50 text-yellow-300';
        case 'low':
          return 'bg-green-900/50 text-green-300';
        default:
          return 'bg-stone-700 text-stone-300';
      }
    } else {
      switch (priority) {
        case 'high':
          return 'bg-red-100 text-red-800';
        case 'medium':
          return 'bg-yellow-100 text-yellow-800';
        case 'low':
          return 'bg-green-100 text-green-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
  };

  return (
    <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-1`}>{job.name}</h3>
          <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-stone-400' : 'text-gray-600'} mb-2`}>
            <Globe className="w-4 h-4" />
            <span>{job.domain}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
              {job.status}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(job.priority)}`}>
              {job.priority}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {job.status === 'running' && (
            <button
              onClick={() => onAction('pause')}
              className={`p-2 text-yellow-600 ${isDarkMode ? 'hover:bg-yellow-900/50' : 'hover:bg-yellow-50'} rounded-lg transition-colors`}
              title="Pause"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          {job.status === 'paused' && (
            <button
              onClick={() => onAction('resume')}
              className={`p-2 text-green-600 ${isDarkMode ? 'hover:bg-green-900/50' : 'hover:bg-green-50'} rounded-lg transition-colors`}
              title="Resume"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          {job.status === 'queued' && (
            <button
              onClick={() => onAction('start')}
              className={`p-2 text-green-600 ${isDarkMode ? 'hover:bg-green-900/50' : 'hover:bg-green-50'} rounded-lg transition-colors`}
              title="Start"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          {(job.status === 'running' || job.status === 'paused') && (
            <button
              onClick={() => onAction('stop')}
              className={`p-2 text-red-600 ${isDarkMode ? 'hover:bg-red-900/50' : 'hover:bg-red-50'} rounded-lg transition-colors`}
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className={isDarkMode ? 'text-stone-400' : 'text-gray-600'}>Progress</span>
          <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'}`}>{job.progress}%</span>
        </div>
        <div className={`w-full ${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} rounded-full h-2`}>
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${job.progress}%` }}
          ></div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <BarChart3 className={`w-4 h-4 ${isDarkMode ? 'text-stone-400' : 'text-gray-400'}`} />
            <span className={isDarkMode ? 'text-stone-400' : 'text-gray-600'}>Pages:</span>
            <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'}`}>{job.pagesFound}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isDarkMode ? 'text-stone-400' : 'text-gray-400'}`} />
            <span className={isDarkMode ? 'text-stone-400' : 'text-gray-600'}>Errors:</span>
            <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'}`}>{job.errors}</span>
          </div>
        </div>

        <div className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'}`}>
          Started: {new Date(job.startTime).toLocaleString()}
        </div>
      </div>
    </div>
  );
}; 