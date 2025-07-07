import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Trash2, Eye, ExternalLink, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import { useDashboard } from '../contexts/DashboardContext';

interface CrawlResult {
  url: string;
  title?: string;
  content?: string;
  status_code?: number;
  crawled_at?: string;
  domain?: string;
  depth?: number;
  content_type?: string;
  content_length?: number;
  links_found?: number;
}

export const ResultsBrowser: React.FC = () => {
  const { showNotification, isDarkMode } = useDashboard();
  const [results, setResults] = useState<CrawlResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

  const fetchResults = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getResults();
      if (response.success) {
        setResults(response.data as CrawlResult[] || []);
      } else {
        showNotification(`Failed to fetch results: ${response.error}`, 'error');
      }
    } catch (error: unknown) {
      showNotification(`Failed to fetch results: ${(error as Error).message || String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, []); // Only run once on mount

  const filteredResults = results.filter(result => {
    const matchesSearch = !searchTerm || 
      result.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (result.title && result.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (result.content && result.content.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDomain = selectedDomain === 'all' || result.domain === selectedDomain;
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'success' && result.status_code === 200) ||
      (selectedStatus === 'error' && result.status_code !== 200);

    return matchesSearch && matchesDomain && matchesStatus;
  });

  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

  const domains = Array.from(new Set(results.map(r => r.domain).filter(Boolean)));

  const handleSelectAll = () => {
    if (selectedResults.size === paginatedResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(paginatedResults.map(r => r.url)));
    }
  };

  const handleSelectResult = (url: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedResults(newSelected);
  };

  const exportResults = (format: 'json' | 'csv') => {
    const dataToExport = selectedResults.size > 0 
      ? results.filter(r => selectedResults.has(r.url))
      : filteredResults;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'crawl_results.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = ['URL', 'Title', 'Status Code', 'Domain', 'Depth', 'Content Type', 'Content Length', 'Links Found', 'Crawled At'];
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(r => [
          `"${r.url}"`,
          `"${r.title || ''}"`,
          r.status_code || '',
          `"${r.domain || ''}"`,
          r.depth || '',
          `"${r.content_type || ''}"`,
          r.content_length || '',
          r.links_found || '',
          `"${r.crawled_at || ''}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'crawl_results.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    showNotification(`Exported ${dataToExport.length} results as ${format.toUpperCase()}`, 'success');
  };

  const clearResults = async () => {
    if (!window.confirm('Are you sure you want to clear all results? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiService.clearResults();
      if (response.success) {
        showNotification('All results cleared successfully', 'success');
        setResults([]);
        setSelectedResults(new Set());
      } else {
        showNotification(`Failed to clear results: ${response.error}`, 'error');
      }
    } catch (error: unknown) {
      showNotification(`Failed to clear results: ${(error as Error).message || String(error)}`, 'error');
    }
  };

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return 'gray';
    if (statusCode >= 200 && statusCode < 300) return 'green';
    if (statusCode >= 300 && statusCode < 400) return 'yellow';
    return 'red';
  };

  const getStatusText = (statusCode?: number) => {
    if (!statusCode) return 'Unknown';
    if (statusCode === 200) return 'OK';
    if (statusCode === 404) return 'Not Found';
    if (statusCode === 403) return 'Forbidden';
    if (statusCode === 500) return 'Server Error';
    return statusCode.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>Results Browser</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchResults}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => exportResults('json')}
            disabled={filteredResults.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          <button
            onClick={() => exportResults('csv')}
            disabled={filteredResults.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`backdrop-blur-xl rounded-xl shadow-md p-6 border ${isDarkMode ? 'bg-zinc-900/70 shadow-zinc-950/50 border-zinc-800/80' : 'bg-white/70 border-slate-200/80'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Filter className={`w-5 h-5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`} />
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
              Search
            </label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Search URLs, titles, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 w-full ${isDarkMode ? 'bg-zinc-800/80 border-zinc-700 text-zinc-200 placeholder-zinc-400' : 'bg-white/80 border-slate-300 text-slate-800 placeholder-slate-500'}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
              Domain
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? 'bg-zinc-800/80 border-zinc-700 text-zinc-200' : 'bg-white/80 border-slate-300 text-slate-800'}`}
            >
              <option value="all">All Domains</option>
              {domains.map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? 'bg-zinc-800/80 border-zinc-700 text-zinc-200' : 'bg-white/80 border-slate-300 text-slate-800'}`}
            >
              <option value="all">All Status</option>
              <option value="success">Success (200)</option>
              <option value="error">Error (Non-200)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearResults}
              disabled={results.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 w-full"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className={`backdrop-blur-xl rounded-xl shadow-md border overflow-hidden ${isDarkMode ? 'bg-zinc-900/70 shadow-zinc-950/50 border-zinc-800/80' : 'bg-white/70 border-slate-200/80'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDarkMode ? 'bg-zinc-800' : 'bg-slate-100'}>
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedResults.size === paginatedResults.length && paginatedResults.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>URL</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Title</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Status</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Domain</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Depth</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                      <span className={`ml-2 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Loading results...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <span className={isDarkMode ? 'text-zinc-400' : 'text-slate-500'}>No results found</span>
                  </td>
                </tr>
              ) : (
                paginatedResults.map((result, index) => (
                  <tr
                    key={result.url}
                    className={`${
                      index % 2 === 0
                        ? isDarkMode ? 'bg-zinc-900' : 'bg-white'
                        : isDarkMode ? 'bg-zinc-800' : 'bg-slate-50'
                    } ${isDarkMode ? 'hover:bg-sky-900/20' : 'hover:bg-sky-50'} transition-colors`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedResults.has(result.url)}
                        onChange={() => handleSelectResult(result.url)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${isDarkMode ? 'text-sky-400 hover:text-sky-300' : 'text-sky-500 hover:text-sky-600'}`}
                        >
                          {result.url}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate">
                        <span className={isDarkMode ? 'text-zinc-200' : 'text-slate-800'}>
                          {result.title || 'No title'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getStatusColor(result.status_code) === 'green'
                          ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                          : getStatusColor(result.status_code) === 'yellow'
                          ? isDarkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                          : isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'
                      }`}>
                        {getStatusText(result.status_code)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={isDarkMode ? 'text-zinc-400' : 'text-slate-500'}>
                        {result.domain || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={isDarkMode ? 'text-zinc-400' : 'text-slate-500'}>
                        {result.depth || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.open(result.url, '_blank')}
                          className={`p-1 transition-colors ${isDarkMode ? 'text-sky-400 hover:text-sky-300' : 'text-sky-500 hover:text-sky-600'}`}
                          title="Open URL"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            // Show result details in a modal or expand row
                            console.log('View details:', result);
                          }}
                          className={`p-1 transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-600'}`}
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`px-4 py-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredResults.length)} of {filteredResults.length} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded disabled:opacity-50 ${isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Previous
                </button>
                <span className={`px-3 py-1 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded disabled:opacity-50 ${isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 