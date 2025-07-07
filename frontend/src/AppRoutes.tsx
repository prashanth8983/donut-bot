import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import JobsPage from './pages/JobsPage';
import DomainManagerPage from './pages/DomainManagerPage';
import { ResultsPage } from './pages/ResultsPage';
import SchedulerPage from './pages/SchedulerPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import NotificationToast from './components/NotificationToast';
import { useDashboard } from './contexts/DashboardContext';

const AppRoutes: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const { notifications, removeNotification, isDarkMode } = useDashboard();
  const location = useLocation();
  const navigate = useNavigate();

  // Get current view from URL path
  const getCurrentView = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard': return 'dashboard';
      case '/jobs': return 'jobs';
      case '/scheduler': return 'scheduler';
      case '/domains': return 'domains';
      case '/results': return 'results';
      case '/settings': return 'settings';
      default: return 'dashboard';
    }
  };

  const handleViewChange = (view: string) => {
    const path = `/${view}`;
    navigate(path);
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-zinc-950 text-zinc-200' : 'bg-slate-50 text-slate-800'}`}>
      <Sidebar
        isMobileOpen={isSidebarOpen}
        setMobileOpen={setIsSidebarOpen}
        isMinimized={isSidebarMinimized}
        setIsMinimized={setIsSidebarMinimized}
        currentView={getCurrentView()}
        setView={handleViewChange}
      />
      <div className={`flex-1 flex flex-col overflow-hidden sidebar-transition ${isSidebarMinimized ? 'lg:ml-20' : 'lg:ml-60'}`}>
        <Header
          isSidebarMinimized={isSidebarMinimized}
          setIsSidebarMinimized={setIsSidebarMinimized}
          onMobileNavOpen={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/scheduler" element={<SchedulerPage />} />
            <Route path="/domains" element={<DomainManagerPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
      <div className="fixed top-24 right-6 z-50 space-y-3">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default AppRoutes;
 