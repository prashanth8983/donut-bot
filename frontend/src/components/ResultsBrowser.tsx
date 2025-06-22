import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, FileText, Globe } from 'lucide-react';
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

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await apiService.getResults();
      if (response.success) {
        setResults(response.data || []);
      } else {
        showNotification(`Failed to fetch results: ${response.error}`, 'error');
      }
    } catch (error) {
      showNotification('Failed to fetch results', 'error');
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      showNotification('Failed to clear results', 'error');
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
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>Results Browser</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportResults('json')}
            disabled={filteredResults.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
      <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <Filter className={`w-5 h-5 ${isDarkMode ? 'text-stone-400' : 'text-gray-600'}`} />
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
              Search
            </label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-stone-400' : 'text-gray-400'} w-4 h-4`} />
              <input
                type="text"
                placeholder="Search URLs, titles, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full ${
                  isDarkMode 
                    ? 'border-stone-600 bg-stone-700 text-stone-100 placeholder-stone-400' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
              Domain
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'border-stone-600 bg-stone-700 text-stone-100' 
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            >
              <option value="all">All Domains</option>
              {domains.map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'border-stone-600 bg-stone-700 text-stone-100' 
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            >
              <option value="all">All Status</option>
              <option value="success">Success (200)</option>
              <option value="error">Error (≠200)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearResults}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Results ({filteredResults.length} total)
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedResults.size === paginatedResults.length && paginatedResults.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Select All</span>
              </label>
              {selectedResults.size > 0 && (
                <span className="text-sm text-blue-600">
                  {selectedResults.size} selected
                </span>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading results...</span>
          </div>
        ) : paginatedResults.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <FileText className="w-12 h-12 text-gray-400" />
            <div className="ml-4">
              <p className="text-lg font-medium text-gray-900">No results found</p>
              <p className="text-gray-600">Try adjusting your filters or start a new crawl.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Links
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedResults.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedResults.has(result.url)}
                        onChange={() => handleSelectResult(result.url)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {result.url}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-sm text-gray-900">
                        {result.title || 'No title'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getStatusColor(result.status_code)}-100 text-${getStatusColor(result.status_code)}-800`}>
                        {getStatusText(result.status_code)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{result.domain || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.content_length ? `${Math.round(result.content_length / 1024)} KB` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.links_found || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredResults.length)} of {filteredResults.length} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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