import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faInfoCircle, faTimes, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { Notification } from '../../contexts/DashboardContext';

interface NotificationToastProps {
    notification: Notification;
    onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
    const icons: Record<Notification['type'], IconDefinition> = {
        success: faCheckCircle,
        error: faExclamationCircle,
        info: faInfoCircle
    };

    const colors: Record<Notification['type'], string> = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    return (
        <div className={`p-4 rounded-lg shadow-lg border transform transition-all duration-300 ${colors[notification.type]}`}>
            <div className="flex items-center justify-between">
                <FontAwesomeIcon icon={icons[notification.type]} className="mr-3" />
                <span className="text-sm font-medium flex-1">{notification.message}</span>
                <button onClick={onClose} className="ml-4">
                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default NotificationToast; 