import React from 'react';
import { useDashboard } from '../../contexts/DashboardContext';

const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className, style }) => {
    const { isDarkMode } = useDashboard();
    
    return (
        <div 
            style={style}
            className={`backdrop-blur-xl rounded-xl shadow-md p-4 sm:p-6 border transition-all duration-300 ${className} ${
                isDarkMode 
                    ? 'bg-zinc-900/70 shadow-zinc-950/50 border-zinc-800/80' 
                    : 'bg-white/70 border-slate-200/80'
            }`}>
            {children}
        </div>
    );
};

export default Card;