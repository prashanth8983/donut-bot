import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useDashboard } from "../../contexts/DashboardContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faTasks,
  faGlobe,
  faCalendarAlt,
  faGear,
  faChevronLeft,
  faChevronRight,
  faCircleQuestion,
  faCode,
  faFileText,
} from "@fortawesome/free-solid-svg-icons";

interface SidebarProps {
  isMinimized: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMinimized, toggleSidebar }) => {
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
    case "fa-solid fa-file-text":
      return faFileText;
    default:
      return faCode;
  }
};

  const sidebarClasses = isDarkMode
    ? "bg-gradient-to-b from-stone-800 via-neutral-800 to-zinc-800 border-stone-700/50 backdrop-blur-xl"
    : "bg-gradient-to-b from-gray-800 via-gray-700 to-gray-900 border-gray-600/30 backdrop-blur-xl shadow-xl shadow-gray-500/20";
  return (
    <div className="relative">
      <div
        className={`${sidebarClasses} border-r flex flex-col h-screen max-h-screen transition-all duration-300 ease-in-out transform hover:shadow-2xl ${
          isMinimized ? "w-20" : "w-64"
        }`}
      >
        <div className={`flex items-center flex-shrink-0 h-24 px-4`}>
          <div
            className={`w-full flex ${
              isMinimized
                ? "justify-center items-center  pb-6"
                : "flex-col justify-center pb-4"
            }`}
          >
            <div
              className={`flex ${
                isMinimized ? "justify-center" : "flex-row items-center w-full"
              }`}
            >
              <div
                className={`${
                  isMinimized ? "w-12 h-12" : "w-10 h-10"
                } bg-white flex items-center justify-center shadow-md hover:scale-105 transition-transform duration-300 flex-shrink-0 rounded-lg`}
              >
                <div className="p-1">
                  <img
                    src="/donut.png"
                    alt="Donut Bot Logo"
                    className={`w-[40px] h-[40px]`}
                  />
                </div>
              </div>

              {!isMinimized && (
                <div className="ml-2 transform transition-opacity duration-300 ease-in-out">
                  <div className="flex items-center">
                    <h1 className="text-xl font-extrabold text-white leading-none tracking-tighter">
                      Donut Bot
                    </h1>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto">
          <nav className="px-4 py-0 space-y-2">
            {menuItems.map((item, index) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center px-4 py-3 mb-2 text-left rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 ${
                    isActive
                      ? isDarkMode
                        ? "bg-gradient-to-r from-stone-700 to-neutral-700 text-violet-400 shadow-lg border border-stone-600/50"
                        : "bg-gradient-to-r from-white/20 to-gray-100/20 text-white shadow-lg border border-white/20 backdrop-blur-sm"
                      : isDarkMode
                      ? "text-stone-300 hover:bg-gradient-to-r hover:from-stone-700/50 hover:to-neutral-700/50 hover:text-violet-300"
                      : "text-gray-100 hover:bg-gradient-to-r hover:from-white/10 hover:to-gray-100/10 hover:text-white"
                  } ${isMinimized ? "justify-center" : ""}`
                }
                title={item.title}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <FontAwesomeIcon
                  icon={getIcon(item.icon)}
                  className={`text-lg transition-all duration-300 ${
                    location.pathname === item.path
                      ? "animate-pulse"
                      : "group-hover:rotate-6"
                  } ${isMinimized ? "" : "mr-3"}`}
                />
                {!isMinimized && (
                  <span className="font-medium transition-all duration-300">
                    {item.title}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Help & Support Section */}
        <div
          className={`px-2 py-2 border-t ${
            isDarkMode ? "border-stone-700/30" : "border-gray-600/30"
          }`}
        >
          <div className="mt-1 space-y-1">
            <a
              href="#"
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                isDarkMode
                  ? "text-stone-300 hover:bg-gradient-to-r hover:from-stone-700/50 hover:to-neutral-700/50 hover:text-violet-300"
                  : "text-gray-100 hover:bg-gradient-to-r hover:from-white/10 hover:to-gray-100/10 hover:text-white"
              } ${isMinimized ? "justify-center" : ""}`}
              title="Help & Support"
            >
              <FontAwesomeIcon
                icon={faCircleQuestion}
                className={`text-lg transition-all duration-300 group-hover:rotate-6 ${
                  isMinimized ? "" : "mr-3"
                }`}
              />
              {!isMinimized && "Help & Support"}
            </a>
          </div>
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button
        className={`absolute -right-3 top-6 z-30 w-6 h-6 rounded-full border-2 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-400/50
          ${
            isDarkMode
              ? "bg-stone-700 border-stone-600 text-stone-300 hover:bg-stone-600 hover:text-violet-400 shadow-lg shadow-stone-900/20"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-800 shadow-lg shadow-gray-500/20"
          }
          flex items-center justify-center`}
        onClick={toggleSidebar}
        aria-label={isMinimized ? "Expand sidebar" : "Collapse sidebar"}
      >
        <FontAwesomeIcon
          icon={isMinimized ? faChevronRight : faChevronLeft}
          className="text-xs transition-all duration-300"
        />
      </button>
    </div>
  );
};

export default Sidebar; 