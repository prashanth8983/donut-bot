import React from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import Card from './Card';

interface ChartCardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    headerAccessory?: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children, className, style, headerAccessory }) => {
    const { isDarkMode } = useDashboard();
    
    return (
        <Card className={`flex flex-col ${className}`} style={style}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className={`text-lg font-bold flex items-center gap-2 mb-4 flex-shrink-0 ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>
                    <div className="text-sky-500">{icon}</div>
                    {title}
                </h2>
                {headerAccessory}
            </div>
            <div className="flex-grow h-full">{children}</div>
        </Card>
    );
};

export default ChartCard;
 