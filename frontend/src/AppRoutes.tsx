import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import JobsPage from './pages/JobsPage';
import DomainManagerPage from './pages/DomainManagerPage';
import { ResultsPage } from './pages/ResultsPage';
import SchedulerPage from './pages/SchedulerPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MobileNav from './components/layout/MobileNav';
import NotificationToast from './components/layout/NotificationToast';
import { useDashboard } from './contexts/DashboardContext';

const AppRoutes: React.FC = () => {
  const { 
    isMobileNavOpen, 
    toggleMobileNav, 
    isSidebarMinimized, 
    toggleSidebar,
    isDarkMode,
    notifications
  } = useDashboard();

  return (
    import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import JobsPage from './pages/JobsPage';
import DomainManagerPage from './pages/DomainManagerPage';
import { ResultsPage } from './pages/ResultsPage';
import SchedulerPage from './pages/SchedulerPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MobileNav from './components/layout/MobileNav';
import NotificationToast from './components/layout/NotificationToast';
import { useDashboard } from './contexts/DashboardContext';

const AppRoutes: React.FC = () => {
  const { 
    isMobileNavOpen, 
    toggleMobileNav, 
    isSidebarMinimized, 
    toggleSidebar,
    isDarkMode,
    notifications
  } = useDashboard();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="flex h-screen overflow-hidden transition-colors duration-300 bg-[var(--color-bg-primary)]">
      <div className="hidden md:block transition-all duration-300 ease-in-out">
        <Sidebar 
          isMinimized={isSidebarMinimized} 
          toggleSidebar={toggleSidebar} 
        />
      </div>

      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <Header toggleSidebar={isSidebarMinimized ? toggleSidebar : toggleMobileNav} />
        
        <div className="md:hidden">
          <MobileNav 
            isSidebarOpen={isMobileNavOpen} 
            toggleSidebar={toggleMobileNav} 
          />
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-6 transition-all duration-300 ease-in-out bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/domains" element={<DomainManagerPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/scheduler" element={<SchedulerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          
          <div className="fixed top-20 right-4 z-50 space-y-2">
            {notifications.map((notification) => (
              <NotificationToast
                key={notification.id}
                notification={notification}
                onClose={() => {}} // Context handles removal
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppRoutes; 