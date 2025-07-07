import React from 'react';
import { useDashboard } from '../../contexts/DashboardContext';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description: string;
    style?: React.CSSProperties;
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, style, className }) => {
    const { isDarkMode } = useDashboard();
    
    return (
        <div 
            style={style}
            className={`group relative overflow-hidden p-4 sm:p-6 rounded-xl border flex flex-col ${className || ''} ${
                isDarkMode 
                    ? 'bg-zinc-800/50 border-zinc-700/60' 
                    : 'bg-slate-100/50 border-slate-200/80'
            }`}
        >
            <div className={`absolute -top-1 -right-1 w-16 h-16 rounded-full group-hover:scale-[8] transition-transform duration-500 ease-out ${
                isDarkMode ? 'bg-sky-500/20' : 'bg-sky-500/10'
            }`}></div>
            <div className="relative z-10 flex flex-col flex-grow">
                <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{title}</p>
                    <div className="text-sky-500">{icon}</div>
                </div>
                <div className="flex-grow flex items-center">
                    <p className={`text-3xl font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{value}</p>
                </div>
                <p className={`text-sm mt-auto pt-2 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{description}</p>
            </div>
        </div>
    );
};

export default StatCard;
 