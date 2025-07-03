import { createContext, useState, useContext, type ReactNode } from 'react';
import { menuItems } from '../constants/menuItems';

interface MenuItem {
  id: string;
  title: string;
  path: string;
  icon: string;
}

export interface Notification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface DashboardContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  isSidebarMinimized: boolean;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  toggleMobileNav: () => void;
  menuItems: MenuItem[];
  notifications: Notification[];
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);
    const toggleSidebar = () => setIsSidebarMinimized(prev => !prev);
    const toggleMobileNav = () => setIsMobileNavOpen(prev => !prev);
    
    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now().toString();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(current => current.filter(n => n.id !== id));
        }, 5000);
    };

    const removeNotification = (id: string) => {
        setNotifications(current => current.filter(n => n.id !== id));
    };

    const value = {
        isDarkMode,
        toggleTheme,
        isSidebarMinimized,
        toggleSidebar,
        isMobileNavOpen,
        toggleMobileNav,
        menuItems,
        notifications,
        showNotification,
        removeNotification
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