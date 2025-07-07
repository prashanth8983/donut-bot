import React, { useState, useRef, useEffect } from "react";
import { useDashboard } from "../../contexts/DashboardContext";
import { Sun, Moon, Bell, Menu, X } from 'lucide-react';

const Header: React.FC<{
  isSidebarMinimized: boolean;
  setIsSidebarMinimized: (min: boolean) => void;
  onMobileNavOpen: () => void;
}> = ({ isSidebarMinimized, setIsSidebarMinimized, onMobileNavOpen }) => {
  const { isDarkMode, toggleDarkMode, notifications } = useDashboard();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className={`relative z-20 flex-shrink-0 backdrop-blur-lg border-b h-20 flex items-center justify-between px-6 ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white/60 border-slate-200'}`}>
      <div className="flex items-center gap-4">
        {/* Mobile nav button */}
        <button 
          onClick={onMobileNavOpen} 
          className="lg:hidden p-2 -ml-2"
          aria-label="Open mobile navigation"
        >
          <Menu size={20} />
        </button>
        
        <h1 className={`text-xl md:text-2xl font-bold capitalize ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>
          Dashboard
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)} 
            className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700/80' : 'bg-slate-200 hover:bg-slate-300/80'}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className={`absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-fade-in-down ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                              <div className={`p-4 flex justify-between items-center border-b ${isDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                  <h3 className={`font-bold text-lg ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}>
                    <X size={18} className={isDarkMode ? 'text-zinc-400' : 'text-slate-500'} />
                  </button>
                </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`p-4 border-b transition-colors ${isDarkMode ? 'border-zinc-800/50' : 'border-slate-100'} ${!notif.read ? (isDarkMode ? 'bg-sky-900/20' : 'bg-sky-50') : (isDarkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50')}`}
                  >
                    <p className={`font-semibold text-sm ${isDarkMode ? 'text-zinc-200' : 'text-slate-700'}`}>{notif.message}</p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{notif.timestamp ? new Date(notif.timestamp).toLocaleString() : 'Unknown time'}</p>
                  </div>
                )) : (
                  <div className={`p-8 text-center ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                    <Bell size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} />
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Theme toggle */}
        <button 
          onClick={toggleDarkMode} 
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700/80' : 'bg-slate-200 hover:bg-slate-300/80'}`}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};

export default Header;
 