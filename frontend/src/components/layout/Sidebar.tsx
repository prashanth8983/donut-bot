import React, { useRef, useEffect } from "react";
import { useDashboard } from "../../contexts/DashboardContext";
import { 
  LayoutDashboard, 
  Workflow, 
  Settings, 
  Calendar, 
  Globe, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  X 
} from 'lucide-react';
import DonutIcon from '../ui/DonutIcon';

interface SidebarProps {
  isMobileOpen: boolean;
  setMobileOpen: (isOpen: boolean) => void;
  isMinimized: boolean;
  setIsMinimized: (isMinimized: boolean) => void;
  currentView: string;
  setView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setMobileOpen, isMinimized, setIsMinimized, currentView, setView }) => {
  const { isDarkMode, menuItems } = useDashboard();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (window.innerWidth < 1024 && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setMobileOpen]);

  const handleLinkClick = (view: string) => {
    setView(view);
    setMobileOpen(false);
  };

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

  const sidebarClasses = isDarkMode
    ? "bg-zinc-900/95 border-zinc-800"
    : "bg-slate-100/95 border-slate-200";

  return (
    <>
      <div
        ref={sidebarRef}
        className={`fixed z-40 inset-y-0 left-0 ${sidebarClasses} border-r backdrop-blur-lg flex flex-col sidebar-transition ${isMinimized ? 'w-20' : 'w-60'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className={`flex items-center flex-shrink-0 h-20 px-4 border-b relative ${isDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
          <div className="w-full flex items-center">
            <div className="w-12 h-12 flex items-center justify-center hover:scale-105 transition-transform duration-300 flex-shrink-0">
              <DonutIcon size={38} />
            </div>
            {!isMinimized && (
              <div className="ml-3">
                <h1 className={`text-xl font-bold leading-none tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Donut Bot</h1>
              </div>
            )}
          </div>

          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
            <X size={20} />
          </button>

          <button
            className={`hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full border-2 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDarkMode 
                ? "bg-zinc-700 border-zinc-600 text-zinc-300 hover:bg-zinc-600 ring-zinc-500"
                : "bg-white border-slate-300 text-slate-600 hover:bg-slate-200 ring-slate-400"
            } items-center justify-center`}
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isMinimized ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="px-4 py-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleLinkClick(item.id)}
                className={`group flex items-center w-full px-4 py-3 text-left rounded-xl transition-all duration-200 ${
                  currentView === item.id
                    ? "bg-sky-500 text-white shadow-md"
                    : `hover:bg-sky-500/10 dark:hover:bg-sky-500/10 ${isDarkMode ? 'text-slate-300 hover:text-sky-300' : 'text-slate-600 hover:text-sky-600'}`
                } ${isMinimized ? "justify-center px-4" : ""}`}
                title={item.title}
              >
                {getIcon(item.icon)}
                {!isMinimized && <span className={`ml-3 font-medium`}>{item.title}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>
      {isMobileOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setMobileOpen(false)}></div>}
    </>
  );
};

export default Sidebar; 
