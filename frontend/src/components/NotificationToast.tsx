import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface NotificationToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  message,
  type,
  onClose,
}) => {
  const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };

  const colorClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const Icon = iconMap[type];

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`flex items-center p-4 border rounded-lg shadow-lg ${colorClasses[type]}`}>
        <Icon className="w-5 h-5 mr-3" />
        <span className="flex-1">{message}</span>
        <button
          onClick={onClose}
          className="ml-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}; 