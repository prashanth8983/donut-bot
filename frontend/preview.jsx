import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { RefreshCw, Activity, Globe, Database, TrendingUp, AlertCircle, CheckCircle, Loader, PieChart as PieIcon, BarChart2, Sun, Moon, ListTodo, Plus, Search, Trash2, LayoutDashboard, Briefcase, ChevronLeft, ChevronRight, Settings, Play, Square, RotateCcw, Zap, Clock, Eye, Upload, Download, Calendar, Server, HardDrive, Edit, ToggleLeft, ToggleRight, Check, X, Hourglass, PauseCircle, Bell, Menu } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar, LineChart, Line } from 'recharts';

// --- MOCK DATA & TYPES (No Changes) ---

// 1. TypeScript Types
type CrawlJobStatus = 'running' | 'completed' | 'failed' | 'pending' | 'paused' | 'queued';
type CrawlJobPriority = 'low' | 'medium' | 'high';
type ScheduledJobStatus = 'enabled' | 'disabled';

interface CrawlJob {
  id: string;
  name: string;
  domain: string;
  status: CrawlJobStatus;
  priority: CrawlJobPriority;
  startTime: string | null;
  start_time?: string | null;
  end_time?: string | null;
  pagesCrawled: number;
  pages_found: number;
  progress: number;
  errors: number;
  description?: string;
  max_pages?: number;
  max_depth?: number;
  tags?: string[];
  data_size?: string;
  avg_response_time?: string;
  success_rate?: number;
  created_at?: string;
  updated_at?: string;
  scheduled?: boolean;
}

interface Notification {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    read: boolean;
}

interface ScheduledJob {
    id: string;
    name: string;
    domain: string;
    status: ScheduledJobStatus;
    schedule: string;
    nextRun: string;
    lastRun: string;
    priority: CrawlJobPriority;
    category: string;
}

interface CrawlerStatus {
  pages_crawled_total: number;
  avg_pages_per_second: number;
  total_errors_count: number;
  crawler_running: boolean;
  uptime_seconds: number;
  max_pages_configured?: number;
  frontier_queue_size?: number;
  urls_in_processing?: number;
  urls_completed_redis?: number;
  robots_denied_count: number;
}

interface Metrics {
  total_data_size: string;
  pages_crawled_over_time: number[];
  errors_over_time: number[];
  content_type_counts: Record<string, number>;
  status_code_counts: Record<string, number>;
  queue_size_over_time: number[];
  crawl_rate_over_time: number[];
  daily_crawl_heatmap: number[][];
}

interface QueueStatus {
  queue_size: number;
  processing_count: number;
  completed_count: number;
  seen_count: number;
}

interface JobsApiResponse {
  jobs: CrawlJob[];
  count: number;
}

interface JobStatsOverview {
    status_distribution: Record<CrawlJobStatus, number>;
    top_domains_by_pages: { domain: string; pages: number }[];
}

interface ScheduledJobsApiResponse {
    scheduled_jobs: ScheduledJob[];
    count: number;
}

interface SystemHealth {
    status: string;
    service: string;
    timestamp: string;
}

interface KafkaStatus {
    connected: boolean;
    brokers: string[];
    topics: string[];
}

interface StorageStatus {
    local_storage: {
        enabled: boolean;
        directory: string;
        total_size: string;
    };
    kafka_storage: {
        enabled: boolean;
        topic: string;
    };
}

interface CrawlerConfig {
    workers: number;
    max_depth: number;
    delay: number;
    user_agent: string;
}

interface MenuItem {
    id: string;
    title: string;
    icon: string;
}

// 2. Mock API Service
const mockData = {
  notifications: [
      { id: 'notif-1', title: 'Crawl Job Completed', description: 'Northeastern University Crawl finished successfully.', timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(), read: false },
      { id: 'notif-2', title: 'Crawl Job Failed', description: 'MIT Engineering crawl failed with 156 errors.', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), read: false },
      { id: 'notif-3', title: 'System Healthy', description: 'All services are running normally.', timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), read: true },
      { id: 'notif-4', title: 'New Domain Added', description: 'Domain "example.com" was added to the allowed list.', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), read: true },
  ],
  crawlerStatus: { crawler_running: true, uptime_seconds: 12456.78, pages_crawled_total: 1234567, max_pages_configured: 10000, pages_remaining_in_limit: 7654, avg_pages_per_second: 15.8, frontier_queue_size: 5432, urls_in_processing: 12, urls_completed_redis: 1215678, urls_seen_redis: 2345678, bloom_filter_items: 3456789, robots_denied_count: 1234, total_errors_count: 4021, active_workers_configured: 4, current_time_utc: "2024-01-15T16:00:00Z", allowed_domains: ["northeastern.edu", "nyu.edu", "stanford.edu", "mit.edu", "harvard.edu"] },
  jobs: { jobs: [ { id: "job-001", name: "Northeastern University Crawl", domain: "northeastern.edu", status: "running", progress: 67.5, pages_found: 2345, errors: 23, start_time: "2024-01-15T10:30:00Z", end_time: null, max_depth: 3, max_pages: 5000, scheduled: false, priority: "high", description: "Comprehensive crawl of Northeastern University website", tags: ["education", "university", "research"], data_size: "45.2 MB", avg_response_time: "1.2s", success_rate: 98.9, created_at: "2024-01-15T10:25:00Z", updated_at: "2024-01-15T14:30:00Z", pagesCrawled: 2345, startTime: "2024-01-15T10:30:00Z" }, { id: "job-002", name: "NYU Academic Pages", domain: "nyu.edu", status: "completed", progress: 100.0, pages_found: 1890, errors: 12, start_time: "2024-01-14T09:00:00Z", end_time: "2024-01-14T16:45:00Z", max_depth: 2, max_pages: 2000, scheduled: false, priority: "medium", description: "Academic department pages crawl", tags: ["education", "academic"], data_size: "32.1 MB", avg_response_time: "0.8s", success_rate: 99.4, created_at: "2024-01-14T08:55:00Z", updated_at: "2024-01-14T16:45:00Z", pagesCrawled: 1890, startTime: "2024-01-14T09:00:00Z" }, { id: "job-003", name: "Stanford Research Crawl", domain: "stanford.edu", status: "paused", progress: 34.2, pages_found: 890, errors: 45, start_time: "2024-01-15T08:00:00Z", end_time: null, max_depth: 4, max_pages: 8000, scheduled: true, priority: "high", description: "Research publications and labs crawl", tags: ["research", "publications", "labs"], data_size: "18.7 MB", avg_response_time: "1.5s", success_rate: 95.1, created_at: "2024-01-15T07:55:00Z", updated_at: "2024-01-15T12:30:00Z", pagesCrawled: 890, startTime: "2024-01-15T08:00:00Z" }, { id: "job-004", name: "MIT Engineering", domain: "mit.edu", status: "failed", progress: 12.5, pages_found: 234, errors: 156, start_time: "2024-01-13T14:00:00Z", end_time: "2024-01-13T15:30:00Z", max_depth: 3, max_pages: 3000, scheduled: false, priority: "medium", description: "Engineering department crawl", tags: ["engineering", "technology"], data_size: "4.2 MB", avg_response_time: "2.1s", success_rate: 60.0, created_at: "2024-01-13T13:55:00Z", updated_at: "2024-01-13T15:30:00Z", pagesCrawled: 234, startTime: "2024-01-13T14:00:00Z" }, { id: "job-005", name: "Harvard Library", domain: "harvard.edu", status: "queued", progress: 0.0, pages_found: 0, errors: 0, start_time: null, end_time: null, max_depth: 2, max_pages: 1500, scheduled: true, priority: "low", description: "Library resources crawl", tags: ["library", "resources"], data_size: "0 MB", avg_response_time: "0s", success_rate: 0.0, created_at: "2024-01-15T16:00:00Z", updated_at: "2024-01-15T16:00:00Z", pagesCrawled: 0, startTime: null } ], count: 5 },
  metrics_24h: { daily_crawl_heatmap: [ [0, 5, 12, 25, 14, 6, 2], [2, 8, 15, 30, 18, 8, 3], [4, 10, 20, 40, 22, 10, 4], [3, 9, 18, 35, 20, 9, 3], [1, 6, 14, 28, 16, 7, 2], [0, 4, 10, 22, 12, 5, 1], [0, 2, 8, 15, 10, 4, 0] ], pages_crawled_over_time: [1200, 1300, 1100, 900, 950, 1000, 1050, 1200, 1300, 1400, 1350, 1200, 1100, 1000, 950, 900, 850, 800, 950, 1000, 1100, 1200, 1300, 1400], errors_over_time: [10, 12, 8, 7, 9, 11, 10, 8, 7, 6, 5, 8, 9, 10, 11, 12, 10, 9, 8, 7, 6, 5, 4, 3], total_data_size: "156.7 MB", content_type_counts: { "HTML": 45678, "JSON": 12345, "PDF": 2345, "Image": 5678 }, status_code_counts: { "200": 1234567, "404": 12345, "301": 8901, "500": 2345 }, crawl_rate_over_time: [15, 16, 14, 12, 13, 14, 15, 16, 17, 18, 17, 16, 15, 14, 13, 12, 11, 12, 13, 14, 15, 16, 17, 18], queue_size_over_time: [2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900, 4000, 4100, 4200, 4300] },
  jobStatsOverview: { status_distribution: { running: 1, completed: 1, failed: 1, paused: 1, queued: 1 }, top_domains_by_pages: [ { domain: "northeastern.edu", pages: 2345 }, { domain: "nyu.edu", pages: 1890 }, { domain: "stanford.edu", pages: 890 }, { domain: "mit.edu", pages: 234 }, { domain: "harvard.edu", pages: 0 } ] },
  queueStatus: { queue_size: 5432, processing_count: 12, completed_count: 1215678, seen_count: 2345678 },
  config: { workers: 4, max_depth: 3, delay: 1.0, user_agent: "DonutBot/1.0" },
  allowedDomains: { allowed_domains: ["northeastern.edu", "nyu.edu", "stanford.edu", "mit.edu", "harvard.edu"] },
  scheduledJobs: { scheduled_jobs: [ { id: "sched-001", name: "Daily Northeastern Crawl", domain: "northeastern.edu", status: "enabled", schedule: "0 2 * * *", nextRun: "2024-01-16T02:00:00Z", lastRun: "2024-01-15T02:00:00Z", priority: "medium", category: "daily" }, { id: "sched-002", name: "Weekly Stanford Research", domain: "stanford.edu", status: "enabled", schedule: "0 3 * * 1", nextRun: "2024-01-22T03:00:00Z", lastRun: "2024-01-15T03:00:00Z", priority: "high", category: "weekly" }, { id: "sched-003", name: "Monthly Harvard Library", domain: "harvard.edu", status: "disabled", schedule: "0 4 1 * *", nextRun: "2024-02-01T04:00:00Z", lastRun: "2024-01-01T04:00:00Z", priority: "low", category: "monthly" } ], count: 3 },
  health: { status: "healthy", service: "donut-bot-api", timestamp: "2024-01-15T16:00:00Z" },
  kafkaStatus: { connected: true, brokers: ["localhost:9092"], topics: ["raw-documents", "processed-documents"] },
  storageStatus: { local_storage: { enabled: true, directory: "/app/crawler_output", total_size: "2.3 GB" }, kafka_storage: { enabled: false, topic: "raw-documents" } },
};

const mockApiService = {
  getNotifications: async (): Promise<{ success: true; data: Notification[] }> => ({ success: true, data: mockData.notifications }),
  getCrawlerStatus: async (): Promise<{ success: true; data: CrawlerStatus }> => ({ success: true, data: mockData.crawlerStatus }),
  getMetrics: async (): Promise<{ success: true; data: Metrics }> => ({ success: true, data: mockData.metrics_24h }),
  getQueueStatus: async (): Promise<{ success: true; data: QueueStatus }> => ({ success: true, data: mockData.queueStatus }),
  getJobs: async (): Promise<{ success: true; data: JobsApiResponse }> => ({ success: true, data: mockData.jobs }),
  getJobStatsOverview: async (): Promise<{ success: true; data: JobStatsOverview }> => ({ success: true, data: mockData.jobStatsOverview }),
  getScheduledJobs: async (): Promise<{ success: true; data: ScheduledJobsApiResponse }> => ({ success: true, data: mockData.scheduledJobs }),
  getHealth: async (): Promise<{ success: true; data: SystemHealth }> => ({ success: true, data: mockData.health }),
  getKafkaStatus: async (): Promise<{ success: true; data: KafkaStatus }> => ({ success: true, data: mockData.kafkaStatus }),
  getStorageStatus: async (): Promise<{ success: true; data: StorageStatus }> => ({ success: true, data: mockData.storageStatus }),
  getConfig: async (): Promise<{ success: true; data: CrawlerConfig }> => ({ success: true, data: mockData.config }),
  updateConfig: async (config: CrawlerConfig): Promise<{ success: true; data: CrawlerConfig }> => { mockData.config = config; return { success: true, data: mockData.config }; },
  startCrawler: async (): Promise<{ success: true }> => { mockData.crawlerStatus.crawler_running = true; mockData.crawlerStatus.uptime_seconds = 0; return { success: true }; },
  stopCrawler: async (): Promise<{ success: true }> => { mockData.crawlerStatus.crawler_running = false; return { success: true }; },
  resetCrawler: async (): Promise<{ success: true }> => { mockData.crawlerStatus.pages_crawled_total = 0; mockData.crawlerStatus.total_errors_count = 0; return { success: true }; },
  getAllowedDomains: async (): Promise<{ success: true, data: { allowed_domains: string[] } }> => ({ success: true, data: mockData.allowedDomains }),
  updateAllowedDomains: async (action: 'add' | 'remove', domains: string[]): Promise<{ success: true }> => {
      if (action === 'add') { mockData.allowedDomains.allowed_domains = [...new Set([...mockData.allowedDomains.allowed_domains, ...domains])]; }
      else { mockData.allowedDomains.allowed_domains = mockData.allowedDomains.allowed_domains.filter(d => !domains.includes(d)); }
      return { success: true };
  },
  addUrls: async (urls: string[]): Promise<{ success: true }> => { mockData.queueStatus.queue_size += urls.length; return { success: true }; },
  clearUrls: async (): Promise<{ success: true }> => { mockData.queueStatus.queue_size = 0; return { success: true }; },
  startJob: async (jobId: string): Promise<{ success: true }> => { const job = mockData.jobs.jobs.find(j => j.id === jobId); if(job) job.status = 'running'; return { success: true }; },
  stopJob: async (jobId: string): Promise<{ success: true }> => { const job = mockData.jobs.jobs.find(j => j.id === jobId); if(job) job.status = 'completed'; return { success: true }; },
  pauseJob: async (jobId: string): Promise<{ success: true }> => { const job = mockData.jobs.jobs.find(j => j.id === jobId); if(job) job.status = 'paused'; return { success: true }; },
  resumeJob: async (jobId: string): Promise<{ success: true }> => { const job = mockData.jobs.jobs.find(j => j.id === jobId); if(job) job.status = 'running'; return { success: true }; },
  enableScheduledJob: async (jobId: string): Promise<{ success: true }> => { mockData.scheduledJobs.scheduled_jobs = mockData.scheduledJobs.scheduled_jobs.map(j => j.id === jobId ? {...j, status: 'enabled'} : j); return { success: true }; },
  disableScheduledJob: async (jobId: string): Promise<{ success: true }> => { mockData.scheduledJobs.scheduled_jobs = mockData.scheduledJobs.scheduled_jobs.map(j => j.id === jobId ? {...j, status: 'disabled'} : j); return { success: true }; },
  deleteScheduledJob: async (jobId: string): Promise<{ success: true }> => { mockData.scheduledJobs.scheduled_jobs = mockData.scheduledJobs.scheduled_jobs.filter(j => j.id !== jobId); return { success: true }; },
};

// --- Custom Hooks & Context ---
const useApi = <T,>() => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const execute = useCallback(async (apiCall: () => Promise<{ success: boolean; data?: any; error?: string }>) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiCall();
            if (response.success) {
                setData(response.data);
            } else {
                setError(response.error || 'An unknown error occurred');
            }
            return response;
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred');
            return { success: false, error: e.message };
        } finally {
            setLoading(false);
        }
    }, []);
    return { data, loading, error, execute };
};

interface DashboardContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
  menuItems: MenuItem[];
}
const DashboardContext = createContext<DashboardContextType | null>(null);
const useDashboard = () => useContext(DashboardContext)!;

const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  useEffect(() => { document.documentElement.classList.toggle('dark', isDarkMode); }, [isDarkMode]);
  const value = {
      isDarkMode,
      toggleDarkMode: () => setIsDarkMode(!isDarkMode),
      showNotification: (msg: string, type: string) => console.log(`[${type.toUpperCase()}] ${msg}`),
      menuItems: [
          { id: 'dashboard', title: 'Dashboard', icon: 'LayoutDashboard' },
          { id: 'jobs', title: 'Jobs', icon: 'Briefcase' },
          { id: 'scheduler', title: 'Scheduler', icon: 'Calendar' },
          { id: 'add_urls', title: 'Add URLs', icon: 'Plus' },
          { id: 'domains', title: 'Domains', icon: 'Globe' },
          { id: 'status', title: 'System Status', icon: 'Server' },
          { id: 'config', title: 'Configuration', icon: 'Settings' },
      ]
  };
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};


// --- REUSABLE & STYLED COMPONENTS (IMPROVED) ---
const Card: React.FC<{ children: React.ReactNode; className?: string, style?: React.CSSProperties }> = ({ children, className = '', style }) => (
    <div style={style} className={`bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-xl shadow-md dark:shadow-zinc-950/50 p-4 sm:p-6 border border-slate-200/80 dark:border-zinc-800/80 transition-all duration-300 ${className}`}>{children}</div>
);
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; description: string; className?: string }> = ({ title, value, icon, description, className }) => (
  <div className={`group relative overflow-hidden p-4 sm:p-6 rounded-xl bg-slate-100/50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 flex flex-col ${className}`}>
    <div className="absolute -top-1 -right-1 bg-sky-500/10 dark:bg-sky-500/20 w-16 h-16 rounded-full group-hover:scale-[8] transition-transform duration-500 ease-out"></div>
    <div className="relative z-10 flex flex-col flex-grow">
        <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{title}</p>
            <div className="text-sky-500 dark:text-sky-400">{icon}</div>
        </div>
        <div className="flex-grow flex items-center">
            <p className="text-3xl font-bold text-slate-800 dark:text-zinc-100">{value}</p>
        </div>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-auto pt-2">{description}</p>
    </div>
  </div>
);
const ChartCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string, style?: React.CSSProperties }> = ({ title, icon, children, className, style }) => (
    <Card className={`flex flex-col ${className}`} style={style}>
        <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2 mb-4 flex-shrink-0"><div className="text-sky-500">{icon}</div>{title}</h2>
        <div className="flex-grow h-full">{children}</div>
    </Card>
);

// --- SIDEBAR COMPONENT (IMPROVED FOR RESPONSIVENESS) ---
const Sidebar: React.FC<{ isMobileOpen: boolean; setMobileOpen: (isOpen: boolean) => void; isMinimized: boolean; setIsMinimized: (isMinimized: boolean) => void; currentView: string; setView: (view: string) => void; }> = ({ isMobileOpen, setMobileOpen, isMinimized, setIsMinimized, currentView, setView }) => {
  const { menuItems, isDarkMode } = useDashboard();
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
        Briefcase: <Briefcase className="w-5 h-5" />,
        Settings: <Settings className="w-5 h-5" />,
        Calendar: <Calendar className="w-5 h-5" />,
        Server: <Server className="w-5 h-5" />,
        Plus: <Plus className="w-5 h-5" />,
        Globe: <Globe className="w-5 h-5" />,
    };
    return icons[iconName] || <Briefcase className="w-5 h-5" />;
  };

  const sidebarClasses = isDarkMode
    ? "bg-zinc-900/95 border-zinc-800"
    : "bg-slate-100/95 border-slate-200";

  return (
    <>
      <div ref={sidebarRef} className={`fixed z-40 inset-y-0 left-0 ${sidebarClasses} border-r backdrop-blur-lg flex flex-col transition-all duration-300 ease-in-out ${isMinimized ? 'w-20' : 'w-64'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className={`flex items-center flex-shrink-0 h-20 px-4 border-b relative ${isDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
          <div className={`w-full flex items-center ${isMinimized ? "justify-center" : ""}`}>
            <div className="w-10 h-10 bg-white dark:bg-zinc-800 flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300 flex-shrink-0 rounded-lg p-1">
              <img src="https://assets-global.website-files.com/65303c120c1589c183395363/65303c120c1589c1833953b0_Logo.svg" alt="Logo" className="w-full h-full" />
            </div>
            {!isMinimized && (
              <div className="ml-3 transition-opacity duration-300">
                <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-none tracking-tight">Crawler</h1>
              </div>
            )}
          </div>
           <button
                className={`hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full border-2 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isDarkMode ? "bg-zinc-700 border-zinc-600 text-zinc-300 hover:bg-zinc-600 ring-zinc-500" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-200 ring-slate-400"} items-center justify-center`}
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
                } ${isMinimized ? "justify-center" : ""}`}
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

// --- NOTIFICATIONS COMPONENT ---
const Notifications: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            const res = await mockApiService.getNotifications();
            if (res.success) setNotifications(res.data);
        };
        fetchNotifications();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const unreadCount = notifications.filter(n => !n.read).length;

    const formatDistanceToNow = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="relative flex items-center justify-center w-10 h-10 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300/80 dark:hover:bg-zinc-700/80 rounded-lg transition-colors">
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {unreadCount}
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border dark:border-zinc-700 overflow-hidden">
                    <div className="p-3 font-bold border-b dark:border-zinc-700">Notifications</div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.map(notif => (
                            <div key={notif.id} className={`p-3 border-b dark:border-zinc-700/50 hover:bg-slate-50 dark:hover:bg-zinc-700/50 ${!notif.read ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
                                <p className="font-semibold text-sm">{notif.title}</p>
                                <p className="text-xs text-slate-500 dark:text-zinc-400">{notif.description}</p>
                                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{formatDistanceToNow(notif.timestamp)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const formatNumber = (num: number): string => {
    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toLocaleString();
};

// --- DASHBOARD PAGE (IMPROVED LAYOUT & VISUALIZATIONS) ---
const Dashboard: React.FC = () => {
  const { isDarkMode } = useDashboard();
  const [crawlerStatus, setCrawlerStatus] = useState<CrawlerStatus | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [jobStats, setJobStats] = useState<JobStatsOverview | null>(null);
  const [activeJobs, setActiveJobs] = useState<CrawlJob[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('24H');
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const fetchData = useCallback(async () => {
    const [crawlerStatusRes, metricsRes, queueStatusRes, jobStatsRes, jobsRes] = await Promise.all([
        mockApiService.getCrawlerStatus(),
        mockApiService.getMetrics(),
        mockApiService.getQueueStatus(),
        mockApiService.getJobStatsOverview(),
        mockApiService.getJobs(),
    ]);
    if (crawlerStatusRes.success) setCrawlerStatus(crawlerStatusRes.data);
    if (metricsRes.success) setMetrics(metricsRes.data);
    if (queueStatusRes.success) setQueueStatus(queueStatusRes.data);
    if (jobStatsRes.success) setJobStats(jobStatsRes.data);
    if (jobsRes.success) setActiveJobs(jobsRes.data.jobs.filter(j => j.status === 'running'));
  }, []);
  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 5000); return () => clearInterval(interval); }, [fetchData]);
  
  const PIE_COLORS = ['#38bdf8', '#f472b6', '#34d399', '#f59e0b', '#818cf8', '#a78bfa'];

  // Chart Data Processing
  const performanceData = (metrics?.pages_crawled_over_time || []).map((pages, index) => ({ time: `${index}:00`, Pages: pages, Errors: (metrics?.errors_over_time?.[index] || 0) }));
  const queueSizeData = (metrics?.queue_size_over_time || []).map((size, index) => ({ time: `${index}:00`, 'Queue Size': size }));
  const jobStatusData = Object.entries(jobStats?.status_distribution || {}).map(([name, value], index) => ({ name, value, fill: PIE_COLORS[index % PIE_COLORS.length] }));
  const httpStatusData = Object.entries(metrics?.status_code_counts || {}).map(([name, value]) => ({ name: `Status ${name}`, value })).sort((a, b) => a.value - b.value);
  const contentTypeData = Object.entries(metrics?.content_type_counts || {}).map(([name, value]) => ({ name, value }));
  const totalJobs = jobStatusData.reduce((acc, cur) => acc + cur.value, 0);
  const totalActivity = metrics?.daily_crawl_heatmap.flat().reduce((sum, val) => sum + val, 0) || 0;
  const filteredActiveJobs = activeJobs.filter(job => job.name.toLowerCase().includes(searchQuery.toLowerCase()) || job.domain.toLowerCase().includes(searchQuery.toLowerCase()));

  // Chart Theming
  const themeColors = isDarkMode
    ? { primary: '#38bdf8', secondary: '#f472b6', grid: '#3f3f46', text: '#a1a1aa' }
    : { primary: '#0ea5e9', secondary: '#ec4899', grid: '#e2e8f0', text: '#64748b' };
    
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-3 rounded-lg shadow-xl border border-slate-200 dark:border-zinc-700">
          <p className="text-sm font-bold text-slate-700 dark:text-zinc-200 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-semibold capitalize" style={{ color: entry.color || entry.payload.fill }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getCardStyle = (index: number) => ({
    transition: `opacity 0.5s ease-out ${index * 80}ms, transform 0.5s ease-out ${index * 80}ms`,
    opacity: isMounted ? 1 : 0,
    transform: isMounted ? 'translateY(0)' : 'translateY(20px)',
  });

  const errorRate = crawlerStatus && crawlerStatus.pages_crawled_total > 0
    ? (crawlerStatus.total_errors_count / crawlerStatus.pages_crawled_total) * 100
    : 0;

  const Heatmap = ({ data }: { data: number[][] }) => {
    if (!data || data.length === 0) return null;
    const max = data.reduce((max, row) => Math.max(max, ...row), 0);
    const colors = isDarkMode
        ? ['#1f2937', '#0c4a6e', '#075985', '#0369a1', '#0284c7']
        : ['#e2e8f0', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9'];

    const getColor = (value: number) => {
        if (value === 0) return colors[0];
        const step = Math.ceil((value / max) * (colors.length - 2));
        return colors[step + 1] || colors[colors.length - 1];
    };

    return (
        <div className="grid grid-cols-7 gap-1 h-full">
            {data.map((week, weekIndex) =>
                week.map((dayValue, dayIndex) => (
                    <div key={`${weekIndex}-${dayIndex}`}
                        className="w-full aspect-square rounded-sm transition-transform hover:scale-125"
                        style={{ backgroundColor: getColor(dayValue) }}
                        title={`Activity: ${dayValue}`}
                    />
                ))
            )}
        </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
        {/* Row 1: Integrated Stats and Performance Chart */}
        <div style={getCardStyle(0)}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard title="Total Pages Crawled" value={formatNumber(crawlerStatus?.pages_crawled_total || 0)} icon={<Globe size={20} />} description="All time" />
                <StatCard title="Crawl Rate" value={`${crawlerStatus?.avg_pages_per_second.toFixed(1) || 0}/s`} icon={<TrendingUp size={20} />} description="Average" />
                <StatCard title="Queue Size" value={formatNumber(queueStatus?.queue_size || 0)} icon={<Loader size={20} />} description="Pending URLs" />
                <StatCard title="Error Rate" value={`${errorRate.toFixed(2)}%`} icon={<AlertCircle size={20} />} description={`${crawlerStatus?.total_errors_count.toLocaleString() || 0} total errors`} />
            </div>
        </div>
        
        {/* Row 2: Integrated Performance Chart */}
        <div style={getCardStyle(4)}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2"><Activity className="text-sky-500" />Crawl Performance</h2>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
                    {['1H', '24H', '7D', '30D'].map(range => (
                        <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${timeRange === range ? 'bg-white dark:bg-zinc-700 text-sky-500 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}>
                            {range}
                        </button>
                    ))}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.5}/><stop offset="95%" stopColor={themeColors.primary} stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={themeColors.secondary} stopOpacity={0.5}/><stop offset="95%" stopColor={themeColors.secondary} stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                    <XAxis dataKey="time" stroke={themeColors.text} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke={themeColors.text} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" formatter={(value) => <span className="capitalize text-slate-600 dark:text-zinc-400">{value}</span>} />
                    <Area type="monotone" dataKey="Pages" stroke={themeColors.primary} fill="url(#colorPages)" strokeWidth={2} activeDot={{ r: 6, strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="Errors" stroke={themeColors.secondary} fill="url(#colorErrors)" strokeWidth={2} activeDot={{ r: 6, strokeWidth: 2 }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>

        {/* Row 3: HTTP Status & Content Types */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            <div className="lg:col-span-6" style={getCardStyle(5)}>
                <ChartCard title="HTTP Status" icon={<CheckCircle />}>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={httpStatusData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={themeColors.grid} />
                            <XAxis type="number" stroke={themeColors.text} fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" stroke={themeColors.text} fontSize={10} tickLine={false} axisLine={false} width={60} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? 'rgba(113, 113, 122, 0.15)' : 'rgba(226, 232, 240, 0.4)' }} />
                            <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} barSize={12}>
                                {httpStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
            <div className="lg:col-span-4" style={getCardStyle(6)}>
                <ChartCard title="Content Types" icon={<PieIcon />}>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Tooltip content={<CustomTooltip />} />
                            <Pie data={contentTypeData} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" dataKey="value" paddingAngle={5}>
                               {contentTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke={isDarkMode ? '#18181b' : '#ffffff'} strokeWidth={2} />)}
                            </Pie>
                             <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ right: 0, fontSize: '12px' }} formatter={(value) => <span className="capitalize text-slate-600 dark:text-zinc-400">{value}</span>} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>

        {/* Row 4: Job Status & Queue Size Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            <div className="lg:col-span-4" style={getCardStyle(7)}>
                <ChartCard title="Job Status" icon={<Briefcase />}>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={jobStatusData} cx="50%" cy="85%" startAngle={180} endAngle={0} innerRadius="60%" outerRadius="100%" paddingAngle={5} dataKey="value">
                                {jobStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke={isDarkMode ? '#18181b' : '#ffffff'} strokeWidth={2} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <text x="50%" y="75%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-800 dark:fill-zinc-100 text-4xl font-bold">
                                {totalJobs}
                            </text>
                            <text x="50%" y="90%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 dark:fill-zinc-400 text-sm">
                                Total Jobs
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
            <div className="lg:col-span-6" style={getCardStyle(8)}>
                <ChartCard title="Queue Size Trend" icon={<TrendingUp />}>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={queueSizeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs><linearGradient id="colorQueue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.7}/><stop offset="95%" stopColor={themeColors.primary} stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                            <XAxis dataKey="time" stroke={themeColors.text} fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke={themeColors.text} fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="Queue Size" stroke={themeColors.primary} fill="url(#colorQueue)" strokeWidth={2} activeDot={{ r: 6, strokeWidth: 2 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>

        {/* Row 5: Active Jobs & Daily Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div style={getCardStyle(9)}>
                 <ChartCard title="Active Jobs" icon={<Zap />}>
                    <div className="flex flex-col h-full">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 w-4 h-4" />
                            <input type="text" placeholder="Search active jobs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white/80 dark:bg-zinc-800/80 border-slate-300 dark:border-zinc-700 text-sm" />
                        </div>
                        <div className="space-y-3 overflow-y-auto flex-grow pr-2">
                            {filteredActiveJobs.length > 0 ? filteredActiveJobs.map(job => (
                                <div key={job.id} className="text-sm">
                                    <div className="font-bold truncate">{job.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-zinc-400">{job.domain}</div>
                                    <div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-1.5 mt-1">
                                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${job.progress}%` }}></div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-slate-500 dark:text-zinc-400 pt-8">No active jobs found.</div>
                            )}
                        </div>
                    </div>
                </ChartCard>
            </div>
            <div style={getCardStyle(10)}>
                <ChartCard title={`Daily Activity (${totalActivity.toLocaleString()})`} icon={<Calendar />}>
                   <div className="flex flex-col h-full">
                        <div className="flex-grow">
                            <Heatmap data={metrics?.daily_crawl_heatmap || []} />
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400 mt-2">
                            <span>Less</span>
                            <div className="flex gap-0.5">
                                {isDarkMode ? ['#1f2937', '#0c4a6e', '#075985', '#0369a1', '#0284c7'].map(c => <div key={c} style={{backgroundColor: c}} className="w-3 h-3 rounded-sm" />) : ['#e2e8f0', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9'].map(c => <div key={c} style={{backgroundColor: c}} className="w-3 h-3 rounded-sm" />)}
                            </div>
                            <span>More</span>
                        </div>
                   </div>
                </ChartCard>
            </div>
        </div>
    </div>
  );
};


// --- App Component (Entry Point) ---
export default function App() {
  return (
    <DashboardProvider>
      <AppContent />
    </DashboardProvider>
  );
}

// --- ALL OTHER COMPONENTS (Jobs, Settings, etc.) remain unchanged ---
// I've omitted them here for brevity, but you should keep them in your file.
// The improvements were focused on the components you requested: Dashboard, Sidebar, and reusable Cards.
// The following components are unchanged but required for the app to run.

// --- JOB PAGE COMPONENTS ---
const JobRow: React.FC<{ job: CrawlJob; idx: number; onJobAction: (jobId: string, action: 'start' | 'stop' | 'pause' | 'resume') => void; onSetDeleteJobId: (id: string) => void; onSetSelectedJob: (job: CrawlJob) => void; currentTime: number; actionLoading: boolean; }> = ({ job, idx, onJobAction, onSetDeleteJobId, onSetSelectedJob, currentTime, actionLoading }) => {
    const [elapsed, setElapsed] = useState('-');

    useEffect(() => {
        const calculateElapsed = () => {
            const startTime = job.startTime || job.start_time;
            if (!startTime) { setElapsed('-'); return; }
            const start = new Date(startTime).getTime();
            if (isNaN(start)) { setElapsed('-'); return; }

            const endTime = job.end_time;
            const end = endTime ? new Date(endTime).getTime() : currentTime;
            if (isNaN(end)) { setElapsed('-'); return; }

            const diff = Math.max(0, Math.floor((end - start) / 1000));
            const h = Math.floor(diff / 3600).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const s = (diff % 60).toString().padStart(2, '0');
            setElapsed(`${h}:${m}:${s}`);
        };
        calculateElapsed();
    }, [job.status, job.startTime, job.start_time, job.end_time, currentTime]);

    const statusClasses: Record<CrawlJobStatus, string> = {
        running: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        failed: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        queued: 'bg-slate-100 text-slate-800 dark:bg-zinc-700 dark:text-zinc-300',
        pending: 'bg-slate-100 text-slate-800 dark:bg-zinc-700 dark:text-zinc-300',
    };
    const priorityClasses: Record<CrawlJobPriority, string> = {
        high: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        low: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    };

    return (
        <div className={`grid grid-cols-12 items-center gap-4 px-4 py-3 rounded-lg transition-colors duration-200 ${idx % 2 === 0 ? 'bg-white/20 dark:bg-zinc-900/20' : 'bg-transparent'} hover:bg-sky-100/50 dark:hover:bg-sky-900/20`}>
            <div className="col-span-2 font-medium truncate">{job.name}</div>
            <div className="col-span-2 text-slate-600 dark:text-zinc-400 truncate">{job.domain}</div>
            <div className="col-span-1"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[job.status]}`}>{job.status}</span></div>
            <div className="col-span-1">{elapsed}</div>
            <div className="col-span-2 flex items-center gap-2">
                <div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-2"><div className="bg-sky-500 h-2 rounded-full" style={{ width: `${job.progress}%` }}></div></div>
                <span className="text-xs w-12 text-right">{job.progress.toFixed(1)}%</span>
            </div>
            <div className="col-span-1 text-right">{job.pages_found.toLocaleString()}</div>
            <div className="col-span-1"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityClasses[job.priority]}`}>{job.priority}</span></div>
            <div className="col-span-2 flex items-center justify-end gap-1">
                {job.status === 'queued' && <button onClick={() => onJobAction(job.id, 'start')} disabled={actionLoading} className="p-1.5 rounded-md hover:bg-green-200 dark:hover:bg-green-800/50 disabled:opacity-50"><Play className="w-4 h-4 text-green-600 dark:text-green-400" /></button>}
                {job.status === 'running' && <button onClick={() => onJobAction(job.id, 'pause')} disabled={actionLoading} className="p-1.5 rounded-md hover:bg-amber-200 dark:hover:bg-amber-800/50 disabled:opacity-50"><PauseCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" /></button>}
                {job.status === 'paused' && <button onClick={() => onJobAction(job.id, 'resume')} disabled={actionLoading} className="p-1.5 rounded-md hover:bg-green-200 dark:hover:bg-green-800/50 disabled:opacity-50"><Play className="w-4 h-4 text-green-600 dark:text-green-400" /></button>}
                {(job.status === 'running' || job.status === 'paused') && <button onClick={() => onJobAction(job.id, 'stop')} disabled={actionLoading} className="p-1.5 rounded-md hover:bg-red-200 dark:hover:bg-red-800/50 disabled:opacity-50"><Square className="w-4 h-4 text-red-600 dark:text-red-400" /></button>}
                <button onClick={() => onSetDeleteJobId(job.id)} disabled={actionLoading || job.status === 'running'} className="p-1.5 rounded-md hover:bg-red-200 dark:hover:bg-red-800/50 disabled:opacity-50"><Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" /></button>
                <button onClick={() => onSetSelectedJob(job)} className="p-1.5 rounded-md hover:bg-sky-200 dark:hover:bg-sky-800/50"><ListTodo className="w-4 h-4 text-sky-600 dark:text-sky-400" /></button>
            </div>
        </div>
    );
};

const JobsList: React.FC = React.memo(() => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const jobsApi = useApi<JobsApiResponse>();
  const { execute: jobsApiExecute } = jobsApi;

  const fetchJobs = useCallback(() => { jobsApiExecute(mockApiService.getJobs); }, [jobsApiExecute]);

  useEffect(() => { fetchJobs(); const interval = setInterval(fetchJobs, 3000); return () => clearInterval(interval); }, [fetchJobs]);
  useEffect(() => { const timer = setInterval(() => setCurrentTime(Date.now()), 1000); return () => clearInterval(timer); }, []);

  const handleJobAction = useCallback(async (jobId: string, action: 'start' | 'stop' | 'pause' | 'resume') => {
    setActionLoading(prev => new Set(prev).add(jobId));
    // In a real app, you would await the API call and then refetch.
    // The timeout simulates the delay for the mock API to update.
    const apiCall = { start: mockApiService.startJob, stop: mockApiService.stopJob, pause: mockApiService.pauseJob, resume: mockApiService.resumeJob }[action];
    await apiCall(jobId);
    setTimeout(() => {
        fetchJobs();
        setActionLoading(prev => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
        });
    }, 500);
  }, [fetchJobs]);

  const filteredJobs = React.useMemo(() => (jobsApi.data?.jobs || [])
    .filter(job => (searchQuery === '' || job.name.toLowerCase().includes(searchQuery.toLowerCase()) || job.domain.toLowerCase().includes(searchQuery.toLowerCase())) && (filterStatus === 'all' || job.status === filterStatus)), 
    [jobsApi.data, searchQuery, filterStatus]);

  return (
    <Card className="w-full mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-zinc-100">Job Queue</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                <Plus className="w-4 h-4" /> New Job
            </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-grow sm:flex-grow-0"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 w-5 h-5" /><input type="text" placeholder="Search jobs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white/80 dark:bg-zinc-700/80 border-slate-300 dark:border-zinc-600" /></div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white/80 dark:bg-zinc-700/80 border-slate-300 dark:border-zinc-600"><option value="all">All Status</option><option value="running">Running</option><option value="completed">Completed</option><option value="paused">Paused</option><option value="failed">Failed</option><option value="queued">Queued</option></select>
            <button onClick={fetchJobs} disabled={jobsApi.loading} className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600"><RefreshCw className={`w-4 h-4 ${jobsApi.loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
        <div className="space-y-2">
            <div className="grid grid-cols-12 items-center gap-4 px-4 py-2 text-xs font-semibold uppercase text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-700">
                <div className="col-span-2">Name</div><div className="col-span-2">Domain</div><div className="col-span-1">Status</div><div className="col-span-1">Elapsed</div><div className="col-span-2">Progress</div><div className="col-span-1 text-right">Pages</div><div className="col-span-1">Priority</div><div className="col-span-2 text-right">Actions</div>
            </div>
            {jobsApi.loading && !jobsApi.data ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-slate-200/50 dark:bg-zinc-700/50 rounded-lg animate-pulse"></div>) :
             filteredJobs.length > 0 ? filteredJobs.map((job, idx) => <JobRow key={job.id} job={job} idx={idx} onJobAction={handleJobAction} onSetDeleteJobId={() => {}} onSetSelectedJob={() => {}} currentTime={currentTime} actionLoading={actionLoading.has(job.id)} />) :
             <div className="text-center py-12"><h3 className="text-lg font-medium">No jobs found</h3><p className="text-slate-500 dark:text-zinc-400">Try adjusting your filters.</p></div>
            }
        </div>
    </Card>
  );
});


const CrawlerControls: React.FC = () => {
  const { showNotification, isDarkMode } = useDashboard();
  const [status, setStatus] = useState<CrawlerStatus | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uptime, setUptime] = useState<number>(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const fetchStatus = useCallback(async () => {
    const response = await mockApiService.getCrawlerStatus();
    if (response.success) setStatus(response.data || null);
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (status) setUptime(status.uptime_seconds);
  }, [status?.uptime_seconds]);

  useEffect(() => {
    if (status?.crawler_running) {
        const timer = setInterval(() => setUptime((prev) => prev + 1), 1000);
        return () => clearInterval(timer);
    }
  }, [status?.crawler_running]);

  const handleAction = useCallback(async (action: string, apiCall: () => Promise<any>) => {
    setActionLoading(action);
    try {
      const response = await apiCall();
      if (response.success) {
        showNotification(`Crawler ${action} successfully`, 'success');
        fetchStatus();
      } else {
        showNotification(`Failed to ${action} crawler`, 'error');
      }
    } catch (error: unknown) {
      showNotification(`Failed to ${action} crawler: ${(error as Error).message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [fetchStatus, showNotification]);

  const handleStart = () => handleAction('start', mockApiService.startCrawler);
  const handleStop = () => handleAction('stop', mockApiService.stopCrawler);
  const handleReset = () => {
    setShowResetConfirm(false);
    handleAction('reset', mockApiService.resetCrawler);
  };
  
  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}h ${m}m ${s}s`;
  };

  const statusColor = status?.crawler_running ? 'bg-green-500' : 'bg-red-500';
  const statusText = status?.crawler_running ? 'Running' : 'Stopped';

  return (
    <>
      <Card>
        <h3 className="text-lg font-bold mb-4">Crawler Controls</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-zinc-700/50' : 'bg-slate-100'}`}>
                <div className="flex items-center gap-2 mb-1"><div className={`w-3 h-3 rounded-full ${statusColor}`}></div><span className="text-sm font-medium">Status</span></div>
                <p className="text-lg font-semibold">{statusText}</p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-zinc-700/50' : 'bg-slate-100'}`}>
                <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4" /><span className="text-sm font-medium">Uptime</span></div>
                <p className="text-lg font-semibold">{formatUptime(uptime)}</p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-zinc-700/50' : 'bg-slate-100'}`}>
                <div className="flex items-center gap-2 mb-1"><Zap className="w-4 h-4" /><span className="text-sm font-medium">Pages/Sec</span></div>
                <p className="text-lg font-semibold">{status?.avg_pages_per_second.toFixed(2) ?? '0.00'}</p>
            </div>
        </div>
        <div className="flex flex-wrap gap-3">
            <button onClick={handleStart} disabled={status?.crawler_running || !!actionLoading} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"><Play className="w-4 h-4" />{actionLoading === 'start' ? 'Starting...' : 'Start'}</button>
            <button onClick={handleStop} disabled={!status?.crawler_running || !!actionLoading} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"><Square className="w-4 h-4" />{actionLoading === 'stop' ? 'Stopping...' : 'Stop'}</button>
            <button onClick={() => setShowResetConfirm(true)} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50"><RotateCcw className="w-4 h-4" />{actionLoading === 'reset' ? 'Resetting...' : 'Reset'}</button>
        </div>
      </Card>
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-md">
                <h3 className="text-lg font-bold mb-2">Confirm Reset</h3>
                <p className="text-slate-600 dark:text-zinc-300 mb-6">Are you sure you want to reset the crawler? This will clear all queues and data.</p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-zinc-600 hover:bg-slate-300 dark:hover:bg-zinc-500 transition">Cancel</button>
                    <button onClick={handleReset} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition">Confirm Reset</button>
                </div>
            </Card>
        </div>
      )}
    </>
  );
};

const DomainManager: React.FC = () => {
  const { showNotification } = useDashboard();
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    const response = await mockApiService.getAllowedDomains();
    if (response.success) setDomains(response.data.allowed_domains);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    const response = await mockApiService.updateAllowedDomains('add', [newDomain.trim()]);
    if (response.success) { showNotification('Domain added', 'success'); setNewDomain(''); fetchDomains(); } 
    else { showNotification('Failed to add domain', 'error'); }
  };

  const handleRemoveDomain = async (domain: string) => {
    const response = await mockApiService.updateAllowedDomains('remove', [domain]);
    if (response.success) { showNotification('Domain removed', 'success'); fetchDomains(); }
    else { showNotification('Failed to remove domain', 'error'); }
  };

  return (
    <Card className="h-full">
      <h3 className="text-lg font-bold mb-4">Domain Manager</h3>
      <div className="flex gap-2 mb-4">
        <input type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="Add new domain (e.g. example.com)" className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white/80 dark:bg-zinc-700/80 border-slate-300 dark:border-zinc-600" />
        <button onClick={handleAddDomain} disabled={!newDomain.trim()} className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition disabled:opacity-50"><Plus className="w-4 h-4" /> Add</button>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? <p>Loading...</p> : domains.length === 0 ? <p className="text-center text-slate-500 dark:text-zinc-400 py-4">No domains configured.</p> : domains.map(domain => (
          <div key={domain} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-zinc-700/50">
            <span className="font-medium">{domain}</span>
            <button onClick={() => handleRemoveDomain(domain)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </Card>
  );
};

const UrlManager: React.FC = () => {
  const { showNotification } = useDashboard();
  const [newUrls, setNewUrls] = useState('');
  const [adding, setAdding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleAddUrls = async () => {
    if (!newUrls.trim()) return;
    const urls = newUrls.split('\n').map(url => url.trim()).filter(Boolean);
    if (urls.length === 0) return;

    setAdding(true);
    const response = await mockApiService.addUrls(urls);
    if (response.success) {
      showNotification(`${urls.length} URLs added successfully`, 'success');
      setNewUrls('');
    } else {
      showNotification(`Failed to add URLs`, 'error');
    }
    setAdding(false);
  };

  const handleClearUrls = async () => {
    setShowClearConfirm(false);
    setClearing(true);
    const response = await mockApiService.clearUrls();
    if (response.success) {
      showNotification('All URLs cleared successfully', 'success');
    } else {
      showNotification(`Failed to clear URLs`, 'error');
    }
    setClearing(false);
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setNewUrls(e.target?.result as string);
    reader.readAsText(file);
  };

  const downloadUrls = () => {
    if (!newUrls.trim()) return;
    const blob = new Blob([newUrls], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'urls.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5" />Add URLs</h2>
        <textarea value={newUrls} onChange={(e) => setNewUrls(e.target.value)} placeholder="https://example.com/page1&#10;https://example.com/page2" rows={8} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white/80 dark:bg-zinc-700/80 border-slate-300 dark:border-zinc-600" />
        <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={handleAddUrls} disabled={adding || !newUrls.trim()} className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition disabled:opacity-50"><Plus className="w-4 h-4" />{adding ? 'Adding...' : 'Add URLs'}</button>
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition cursor-pointer"><Upload className="w-4 h-4" />Upload<input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" /></label>
            <button onClick={downloadUrls} disabled={!newUrls.trim()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"><Download className="w-4 h-4" />Download</button>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-500"><AlertCircle className="w-5 h-5" />Danger Zone</h2>
        <p className="text-sm text-slate-600 dark:text-zinc-300 mb-3">Clearing the queue will remove all pending URLs. This action cannot be undone.</p>
        <button onClick={() => setShowClearConfirm(true)} disabled={clearing} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"><Trash2 className="w-4 h-4" />{clearing ? 'Clearing...' : 'Clear All URLs'}</button>
      </Card>
    </div>
    {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-md">
                <h3 className="text-lg font-bold mb-2">Confirm Clear Queue</h3>
                <p className="text-slate-600 dark:text-zinc-300 mb-6">Are you sure you want to clear all URLs from the queue? This is irreversible.</p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-zinc-600 hover:bg-slate-300 dark:hover:bg-zinc-500 transition">Cancel</button>
                    <button onClick={handleClearUrls} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition">Confirm Clear</button>
                </div>
            </Card>
        </div>
      )}
    </>
  );
};

const SettingsPage: React.FC = () => {
    return (
        <div className="grid grid-cols-1 gap-6 items-start">
            <DomainManager />
        </div>
    );
};

const AddUrlPage: React.FC = () => {
    return (
        <div className="grid grid-cols-1 gap-6 items-start">
            <UrlManager />
        </div>
    );
};


const JobsPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <CrawlerControls />
            <JobsList />
        </div>
    );
};

const SchedulerPage: React.FC = () => {
    const { data, loading, execute } = useApi<ScheduledJobsApiResponse>();
    useEffect(() => {
        execute(mockApiService.getScheduledJobs);
    }, [execute]);

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">Scheduled Jobs</h2>
            <div className="space-y-4">
                {loading ? <p>Loading scheduled jobs...</p> : data?.scheduled_jobs.map(job => (
                    <div key={job.id} className="p-4 rounded-lg bg-slate-100 dark:bg-zinc-800/80">
                        <h3 className="font-bold">{job.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-zinc-400">Domain: {job.domain}</p>
                        <p className="text-sm text-slate-600 dark:text-zinc-400">Schedule: <span className="font-mono">{job.schedule}</span></p>
                        <p className="text-sm text-slate-600 dark:text-zinc-400">Next Run: {new Date(job.nextRun).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const SystemStatusPage: React.FC = () => {
    const healthApi = useApi<SystemHealth>();
    const kafkaApi = useApi<KafkaStatus>();
    const storageApi = useApi<StorageStatus>();

    useEffect(() => {
        healthApi.execute(mockApiService.getHealth);
        kafkaApi.execute(mockApiService.getKafkaStatus);
        storageApi.execute(mockApiService.getStorageStatus);
    }, [healthApi.execute, kafkaApi.execute, storageApi.execute]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Server /> System Health</h3>
                <p>Status: <span className={`font-bold ${healthApi.data?.status === 'healthy' ? 'text-green-500' : 'text-red-500'}`}>{healthApi.data?.status}</span></p>
                <p>Service: {healthApi.data?.service}</p>
                <p>Timestamp: {new Date(healthApi.data?.timestamp || 0).toLocaleString()}</p>
            </Card>
            <Card>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Zap /> Kafka Status</h3>
                <p>Connected: <span className={`font-bold ${kafkaApi.data?.connected ? 'text-green-500' : 'text-red-500'}`}>{kafkaApi.data?.connected ? 'Yes' : 'No'}</span></p>
                <p>Brokers: {kafkaApi.data?.brokers.join(', ')}</p>
                <p>Topics: {kafkaApi.data?.topics.join(', ')}</p>
            </Card>
            <Card>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><HardDrive /> Storage Status</h3>
                <p>Local Storage Enabled: {storageApi.data?.local_storage.enabled ? 'Yes' : 'No'}</p>
                <p>Directory: {storageApi.data?.local_storage.directory}</p>
                <p>Total Size: {storageApi.data?.local_storage.total_size}</p>
                <p>Kafka Storage Enabled: {storageApi.data?.kafka_storage.enabled ? 'Yes' : 'No'}</p>
            </Card>
        </div>
    );
};

const ConfigurationPage: React.FC = () => {
    const configApi = useApi<CrawlerConfig>();
    useEffect(() => { configApi.execute(mockApiService.getConfig); }, [configApi.execute]);

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">Crawler Configuration</h2>
            {configApi.loading ? <p>Loading configuration...</p> : configApi.data &&
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {Object.entries(configApi.data).map(([key, value]) => (
                        <div key={key} className="p-3 bg-slate-100 dark:bg-zinc-800/80 rounded-lg">
                            <p className="font-bold capitalize">{key.replace(/_/g, ' ')}</p>
                            <p className="text-slate-600 dark:text-zinc-300">{Array.isArray(value) ? value.join(', ') : value.toString()}</p>
                        </div>
                    ))}
                </div>
            }
        </Card>
    );
};


// --- App Content Component ---
const AppContent = () => {
    const [view, setView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const { isDarkMode, toggleDarkMode } = useDashboard();

    const renderView = () => {
        switch (view) {
            case 'dashboard': return <Dashboard />;
            case 'jobs': return <JobsPage />;
            case 'scheduler': return <SchedulerPage />;
            case 'domains': return <SettingsPage />;
            case 'add_urls': return <AddUrlPage />;
            case 'status': return <SystemStatusPage />;
            case 'config': return <ConfigurationPage />;
            default: return <Dashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200">
            <Sidebar 
                isMobileOpen={isSidebarOpen} 
                setMobileOpen={setIsSidebarOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
                currentView={view}
                setView={setView}
            />
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 lg:${isMinimized ? 'ml-20' : 'ml-64'}`}>
                <header className="relative z-20 flex-shrink-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-lg border-b border-slate-200 dark:border-zinc-800 h-20 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2">
                            <Menu size={20} />
                        </button>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-zinc-100 capitalize">{view.replace('_', ' ')}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <Notifications />
                        <button onClick={toggleDarkMode} className="flex items-center justify-center w-10 h-10 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300/80 dark:hover:bg-zinc-700/80 rounded-lg transition-colors">
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    {renderView()}
                </main>
            </div>
        </div>
    );
};
