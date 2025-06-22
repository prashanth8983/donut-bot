import React, { useState, useEffect, useRef } from "react";
import { useDashboard } from "../../contexts/DashboardContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSun,
  faMoon,
  faBars,
  faBell,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
import NotificationToast from "./NotificationToast";

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { isDarkMode, toggleTheme, notifications, removeNotification } = useDashboard();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const headerClasses = isDarkMode
    ? "bg-gradient-to-r from-stone-800 to-neutral-800 border-stone-700/50 shadow-xl shadow-stone-900/20"
    : "bg-white/80 border-violet-200/40 shadow-lg shadow-violet-500/5 backdrop-blur-sm";

  const unreadCount = notifications.length;

  return (
    <header
      className={`${headerClasses} border-b sticky top-0 z-20 backdrop-blur-xl shadow-lg`}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section */}
          <div className="flex items-center space-x-6">
            <button onClick={toggleSidebar} className="md:hidden">
              <FontAwesomeIcon icon={faBars} className={`transition-all duration-300 ${isDarkMode ? "text-stone-400" : "text-violet-600"}`} />
            </button>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2.5 rounded-xl transition-all duration-500 transform hover:scale-110 group relative ${
                  isDarkMode
                    ? "hover:bg-stone-700/50 text-stone-300 hover:text-violet-400"
                    : "hover:bg-violet-100 text-slate-600 hover:text-violet-600"
                }`}
              >
                <FontAwesomeIcon
                  icon={faBell}
                  className="drop-shadow-lg"
                />
                {unreadCount > 0 && (
                  <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center ${
                    isDarkMode 
                      ? "bg-red-500 text-white" 
                      : "bg-red-500 text-white"
                  }`}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className={`absolute right-0 mt-2 w-80 rounded-lg shadow-lg border ${
                  isDarkMode 
                    ? "bg-stone-800 border-stone-700" 
                    : "bg-white border-gray-200"
                } z-50`}>
                  <div className={`p-4 border-b ${
                    isDarkMode ? "border-stone-700" : "border-gray-200"
                  }`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-semibold ${
                        isDarkMode ? "text-stone-200" : "text-gray-900"
                      }`}>
                        Notifications
                      </h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className={`p-1 rounded ${
                          isDarkMode 
                            ? "hover:bg-stone-700 text-stone-400" 
                            : "hover:bg-gray-100 text-gray-500"
                        }`}
                      >
                        <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className={`p-4 text-center ${
                        isDarkMode ? "text-stone-400" : "text-gray-500"
                      }`}>
                        <FontAwesomeIcon icon={faBell} className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No notifications</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-2">
                        {notifications.map((notification) => (
                          <NotificationToast
                            key={notification.id}
                            notification={notification}
                            onClose={() => {
                              removeNotification(notification.id);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl transition-all duration-500 transform hover:scale-110 group ${
                isDarkMode
                  ? "hover:bg-stone-700/50 text-stone-300 hover:text-amber-400 hover:rotate-180"
                  : "hover:bg-violet-100 text-slate-600 hover:text-amber-500 hover:-rotate-180"
              }`}
            >
              <FontAwesomeIcon
                icon={isDarkMode ? faSun : faMoon}
                className="drop-shadow-lg"
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 