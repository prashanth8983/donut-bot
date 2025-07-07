import React from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import { LayoutDashboard, Workflow, Settings, Calendar, Globe, FileText } from 'lucide-react';
import DonutIcon from '../ui/DonutIcon';

const MobileNav: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  setView: (view: string) => void;
}> = ({ isOpen, onClose, currentView, setView }) => {
  const { menuItems, isDarkMode } = useDashboard();

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
      Workflow: <Workflow className="w-5 h-5" />,
      Settings: <Settings className="w-5 h-5" />,
      Calendar: <Calendar className="w-5 h-5" />,
      Globe: <Globe className="w-5 h-5" />,
      FileText: <FileText className="w-5 h-5" />,
    };
    return icons[iconName] || <LayoutDashboard className="w-5 h-5" />;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-64 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl z-50 lg:hidden transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800">
            <div className="flex items-center">
              <div className="w-10 h-10 flex items-center justify-center mr-3">
                <DonutIcon size={29} />
              </div>
              <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Donut Bot</h1>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setView(item.id); onClose(); }}
                className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 ${
                  currentView === item.id
                    ? 'bg-sky-500 text-white shadow-md'
                    : `hover:bg-sky-500/10 dark:hover:bg-sky-500/10 ${isDarkMode ? 'text-slate-300 hover:text-sky-300' : 'text-slate-600 hover:text-sky-600'}`
                }`}
                title={item.title}
              >
                {getIcon(item.icon)}
                <span className="ml-3 font-medium">{item.title}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-200 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400 text-center">
            Donut Bot v1.0.0
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNav; 