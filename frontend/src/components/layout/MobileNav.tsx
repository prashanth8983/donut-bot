import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDashboard } from '../../contexts/DashboardContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartLine,
  faTasks,
  faGlobe,
  faCalendarAlt,
  faGear,
  faXmark,
  faCode
} from '@fortawesome/free-solid-svg-icons';

interface MobileNavProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const { menuItems, isDarkMode } = useDashboard();
  const location = useLocation();

  const getIcon = (iconClass: string) => {
    switch (iconClass) {
        case "fa-solid fa-chart-line":
            return faChartLine;
        case "fa-solid fa-tasks":
            return faTasks;
        case "fa-solid fa-globe":
            return faGlobe;
        case "fa-solid fa-calendar-alt":
            return faCalendarAlt;
        case "fa-solid fa-gear":
            return faGear;
        default:
            return faCode;
    }
  };

  return (
    <>
      {/* Mobile navigation overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Mobile navigation menu */}
      <div
        className={`fixed inset-y-0 left-0 flex flex-col z-50 w-64 ${isDarkMode ? 'bg-stone-800' : 'bg-white'} transform transition duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`flex items-center justify-between h-16 px-4 border-b ${isDarkMode ? 'border-stone-700' : 'border-gray-200'}`}>
          <div className="flex items-center">
            <img src="/donut.png" alt="Donut Bot Logo" className="w-8 h-8 mr-2" />
            <span className={`text-xl font-bold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>Donut Bot</span>
          </div>
          <button
            className={`${isDarkMode ? 'text-stone-400 hover:text-stone-200' : 'text-gray-500 hover:text-gray-900'} focus:outline-none`}
            onClick={toggleSidebar}
          >
            <FontAwesomeIcon icon={faXmark} className="text-2xl" />
          </button>
        </div>

        <div className="flex-1 h-0 overflow-y-auto">
          <nav className="px-2 py-4 space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center px-2 py-3 text-sm font-medium rounded-md ${
                    isActive
                      ? isDarkMode 
                        ? 'bg-indigo-900/50 text-indigo-300'
                        : 'bg-indigo-100 text-indigo-900'
                      : isDarkMode
                        ? 'text-stone-300 hover:bg-stone-700 hover:text-stone-100'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
                onClick={toggleSidebar}
              >
                <FontAwesomeIcon 
                  icon={getIcon(item.icon)} 
                  className={`text-lg mr-3 ${
                    location.pathname === item.path
                      ? 'text-indigo-600'
                      : isDarkMode 
                        ? 'text-stone-400 group-hover:text-stone-300'
                        : 'text-gray-500 group-hover:text-gray-500'
                  }`}
                />
                {item.title}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default MobileNav; 