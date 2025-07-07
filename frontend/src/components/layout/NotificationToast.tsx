import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faInfoCircle, faTimes, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { Notification } from '../../types';

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
        success: 'bg-white/80 dark:bg-zinc-900/80 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300',
        error: 'bg-white/80 dark:bg-zinc-900/80 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300',
        info: 'bg-white/80 dark:bg-zinc-900/80 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300'
    };

    return (
        <div className={`p-4 rounded-xl shadow-lg border backdrop-blur-xl flex items-center gap-3 ${colors[notification.type]}`}>
            <FontAwesomeIcon icon={icons[notification.type]} className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium flex-1">{notification.message}</span>
            <button onClick={onClose} className="ml-2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
            </button>
        </div>
    );
};

export default NotificationToast; 