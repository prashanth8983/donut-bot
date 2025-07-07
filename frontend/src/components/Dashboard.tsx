import React, { useState, useEffect, useCallback } from 'react';
import StatCard from './ui/StatCard';
import ChartCard from './ui/ChartCard';
import { 
    Globe, 
    BarChart3, 
    AlertTriangle, 
    Loader, 
    Search, 
    Calendar, 
    Zap, 
    CheckCircle, 
    PieChart as PieChartIcon, 
    AreaChart as AreaChartIcon, 
    TrendingUp,
    Activity,
    Briefcase
} from 'lucide-react';
import { 
    AreaChart, 
    Area, 
    BarChart, 
    Bar, 
    PieChart, 
    Pie, 
    Cell, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer 
} from 'recharts';
import { useDashboard } from '../contexts/DashboardContext';
import type { CrawlJob, CrawlerStatus, Metrics, QueueStatus } from '../types';
import { createMockApiService } from '../data/mockApiData';

// Add missing interface
interface JobStatsOverview {
    status_distribution: Record<string, number>;
    top_domains_by_pages: { domain: string; pages: number }[];
}

const mockApiService = createMockApiService();

const formatNumber = (num: number): string => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString();
};

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
        try {
            const [crawlerStatusRes, metricsRes, queueStatusRes, jobsRes] = await Promise.all([
                mockApiService.getCrawlerStatus(),
                mockApiService.getMetrics('24h'),
                mockApiService.getQueueStatus(),
                mockApiService.getJobs(),
            ]);
            if (crawlerStatusRes.success) setCrawlerStatus(crawlerStatusRes.data);
            if (metricsRes.success) setMetrics(metricsRes.data);
            if (queueStatusRes.success) setQueueStatus(queueStatusRes.data);
            if (jobsRes.success) {
                const jobs = jobsRes.data.jobs;
                setActiveJobs(jobs.filter((j: CrawlJob) => j.status === 'running'));
                // Create job stats from jobs data
                const statusDistribution = jobs.reduce((acc: Record<string, number>, job: CrawlJob) => {
                    acc[job.status] = (acc[job.status] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                const topDomains = jobs
                    .reduce((acc: { domain: string; pages: number }[], job: CrawlJob) => {
                        const existing = acc.find(d => d.domain === job.domain);
                        if (existing) {
                            existing.pages += job.pages_found;
                        } else {
                            acc.push({ domain: job.domain, pages: job.pages_found });
                        }
                        return acc;
                    }, [] as { domain: string; pages: number }[])
                    .sort((a: { domain: string; pages: number }, b: { domain: string; pages: number }) => b.pages - a.pages)
                    .slice(0, 5);
                setJobStats({ status_distribution: statusDistribution, top_domains_by_pages: topDomains });
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const PIE_COLORS = ['#38bdf8', '#f472b6', '#34d399', '#f59e0b', '#818cf8', '#a78bfa'];

    // Chart Data Processing
    const performanceData = (metrics?.pages_crawled_over_time || []).map((pages, index) => ({ time: `${index}:00`, Pages: pages, Errors: (metrics?.errors_over_time?.[index] || 0) }));
    const queueSizeData = (metrics?.queue_size_over_time || []).map((size, index) => ({ time: `${index}:00`, 'Queue Size': size }));
    const jobStatusData = Object.entries(jobStats?.status_distribution || {}).map(([name, value], index) => ({ name, value, fill: PIE_COLORS[index % PIE_COLORS.length] }));
    const httpStatusData = Object.entries(metrics?.status_code_counts || {}).map(([name, value]) => ({ name: `Status ${name}`, value })).sort((a, b) => a.value - b.value);
    const contentTypeData = Object.entries(metrics?.content_type_counts || {}).map(([name, value]) => ({ name, value }));
    const totalJobs = jobStatusData.reduce((acc, cur) => acc + cur.value, 0);
    const totalActivity = metrics?.daily_crawl_heatmap?.flat().reduce((sum: number, val: number) => sum + val, 0) || 0;
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
                    <StatCard title="Crawl Rate" value={`${(crawlerStatus?.avg_pages_per_second || 0).toFixed(1)}/s`} icon={<TrendingUp size={20} />} description="Average" />
                    <StatCard title="Queue Size" value={formatNumber(queueStatus?.queue_size || 0)} icon={<Loader size={20} />} description="Pending URLs" />
                    <StatCard title="Error Rate" value={`${errorRate.toFixed(2)}%`} icon={<AlertTriangle size={20} />} description={`${(crawlerStatus?.total_errors_count || 0).toLocaleString()} total errors`} />
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
                    <ChartCard title="Content Types" icon={<PieChartIcon />}>
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

export { Dashboard };
