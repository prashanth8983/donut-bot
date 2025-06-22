import React from 'react';
import { useDashboard } from '../contexts/DashboardContext';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, trend, className = '' }) => {
  const { isDarkMode } = useDashboard();
  
  return (
    <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-4 sm:p-6 rounded-lg border hover:shadow-md transition-all duration-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className={`${isDarkMode ? 'text-stone-400' : 'text-gray-600'} text-xs sm:text-sm font-medium truncate`}>{title}</p>
          <p className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mt-1 truncate`}>{value}</p>
          {subtitle && (
            <p className={`${isDarkMode ? 'text-stone-500' : 'text-gray-500'} text-xs mt-1 truncate`}>{subtitle}</p>
          )}
        </div>
        <div className={`p-2 sm:p-3 ${isDarkMode ? 'bg-stone-700' : 'bg-gray-100'} rounded-lg flex-shrink-0 ml-3`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isDarkMode ? 'text-stone-400' : 'text-gray-600'}`} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center mt-3 text-xs sm:text-sm">
          <p className="text-green-600 font-medium">{trend}</p>
          <p className={`${isDarkMode ? 'text-stone-500' : 'text-gray-500'} ml-1`}>vs last hour</p>
        </div>
      )}
    </div>
  );
}; 