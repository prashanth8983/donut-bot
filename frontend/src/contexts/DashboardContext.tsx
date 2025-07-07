import { createContext, useState, useContext, type ReactNode, useEffect } from 'react';
import { menuItems } from '../constants/menuItems';
import type { MenuItem, Notification } from '../types';

interface DashboardContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isSidebarMinimized: boolean;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  toggleMobileNav: () => void;
  menuItems: MenuItem[];
  notifications: Notification[];
  showNotification: ((title: string, description: string, type: 'success' | 'error' | 'info') => void) & ((message: string, type: 'success' | 'error' | 'info') => void);
  removeNotification: (id: string) => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
    const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode like preview
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(() => {
        const saved = localStorage.getItem('donut-bot-sidebar-minimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [currentPath, setCurrentPath] = useState('/dashboard');

    // Apply theme to document (like preview.jsx)
    useEffect(() => { 
        document.documentElement.classList.toggle('dark', isDarkMode); 
    }, [isDarkMode]);

    // Save sidebar state to localStorage
    useEffect(() => {
        localStorage.setItem('donut-bot-sidebar-minimized', JSON.stringify(isSidebarMinimized));
    }, [isSidebarMinimized]);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
    const toggleSidebar = () => setIsSidebarMinimized((prev: boolean) => !prev);
    const toggleMobileNav = () => setIsMobileNavOpen((prev: boolean) => !prev);
    
    const showNotification = (
      arg1: string,
      arg2: string,
      arg3?: 'success' | 'error' | 'info'
    ) => {
      let title: string, description: string, type: 'success' | 'error' | 'info';
      if (typeof arg3 === 'string') {
        // Called as (title, description, type)
        title = arg1;
        description = arg2;
        type = arg3;
      } else {
        // Called as (message, type)
        title = '';
        description = arg1;
        type = arg2 as 'success' | 'error' | 'info';
      }
      const id = Date.now().toString();
      setNotifications(prev => [...prev, { id, message: title ? `${title}: ${description}` : description, type }]);
      setTimeout(() => {
        setNotifications(current => current.filter(n => n.id !== id));
      }, 5000);
    };

    const removeNotification = (id: string) => {
        setNotifications(current => current.filter(n => n.id !== id));
    };

    const value = {
        isDarkMode,
        toggleDarkMode,
        isSidebarMinimized,
        toggleSidebar,
        isMobileNavOpen,
        toggleMobileNav,
        menuItems,
        notifications,
        showNotification: showNotification as DashboardContextType['showNotification'],
        removeNotification,
        currentPath,
        setCurrentPath
    };

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}; 