import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { apiService } from '../services/api';
import type { CrawlerConfig } from '../types';
import { useDashboard } from '../contexts/DashboardContext';

interface ConfigurationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ isOpen, onClose }) => {
  const { showNotification, isDarkMode } = useDashboard();
  const [config, setConfig] = useState<CrawlerConfig>({});
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'domains'>('basic');

  const fetchConfiguration = React.useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, domainsRes] = await Promise.all([
        apiService.getConfig(),
        apiService.getAllowedDomains()
      ]);

      if (configRes.success) {
        setConfig(configRes.data || {});
      }

      if (domainsRes.success) {
        setAllowedDomains(domainsRes.data?.allowed_domains || []);
      }
    } catch (error: unknown) {
      showNotification(`Failed to load configuration: ${(error as Error).message || String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (isOpen) {
      fetchConfiguration();
    }
  }, [isOpen, fetchConfiguration]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const response = await apiService.updateConfig(config);
      if (response.success) {
        showNotification('Configuration saved successfully', 'success');
      } else {
        showNotification(`Failed to save configuration: ${response.error}`, 'error');
      }
    } catch (error: unknown) {
      showNotification(`Failed to save configuration: ${(error as Error).message || String(error)}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    try {
      const response = await apiService.updateAllowedDomains('add', [newDomain.trim()]);
      if (response.success) {
        setAllowedDomains(prev => [...prev, newDomain.trim()]);
        setNewDomain('');
        showNotification('Domain added successfully', 'success');
      } else {
        showNotification(`Failed to add domain: ${response.error}`, 'error');
      }
    } catch (error: unknown) {
      showNotification(`Failed to add domain: ${(error as Error).message || String(error)}`, 'error');
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    try {
      const response = await apiService.updateAllowedDomains('remove', [domain]);
      if (response.success) {
        setAllowedDomains(prev => prev.filter(d => d !== domain));
        showNotification('Domain removed successfully', 'success');
      } else {
        showNotification(`Failed to remove domain: ${response.error}`, 'error');
      }
    } catch (error: unknown) {
      showNotification(`Failed to remove domain: ${(error as Error).message || String(error)}`, 'error');
    }
  };

  const updateConfig = (key: keyof CrawlerConfig, value: CrawlerConfig[keyof CrawlerConfig]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-stone-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-stone-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'}`}>Crawler Configuration</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchConfiguration}
              disabled={loading}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                isDarkMode ? 'text-stone-400 hover:text-stone-200' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className={`transition-colors ${isDarkMode ? 'text-stone-400 hover:text-stone-200' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${isDarkMode ? 'border-stone-700' : 'border-gray-200'}`}>
          {[
            { id: 'basic', label: 'Basic Settings' },
            { id: 'advanced', label: 'Advanced Settings' },
            { id: 'domains', label: 'Domain Management' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'basic' | 'advanced' | 'domains')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : isDarkMode 
                    ? 'text-stone-400 hover:text-stone-200' 
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className={`ml-2 ${isDarkMode ? 'text-stone-400' : 'text-gray-600'}`}>Loading configuration...</span>
            </div>
          ) : (
            <>
              {/* Basic Settings */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Workers
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={config.workers || 3}
                        onChange={(e) => updateConfig('workers', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'border-stone-600 bg-stone-700 text-stone-100' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>Number of concurrent workers (1-20)</p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Max Depth
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={config.max_depth || 3}
                        onChange={(e) => updateConfig('max_depth', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'border-stone-600 bg-stone-700 text-stone-100' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>Maximum crawl depth (0-10)</p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Max Pages
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={config.max_pages || 4000}
                        onChange={(e) => updateConfig('max_pages', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'border-stone-600 bg-stone-700 text-stone-100' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>Maximum pages to crawl (0 = unlimited)</p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Delay (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={config.delay || 2.0}
                        onChange={(e) => updateConfig('delay', parseFloat(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'border-stone-600 bg-stone-700 text-stone-100' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>Delay between requests</p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={config.timeout || 30}
                        onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'border-stone-600 bg-stone-700 text-stone-100' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>Request timeout</p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        User Agent
                      </label>
                      <input
                        type="text"
                        value={config.user_agent || ''}
                        onChange={(e) => updateConfig('user_agent', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'border-stone-600 bg-stone-700 text-stone-100' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="Mozilla/5.0 (compatible; WebCrawler/1.0)"
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>Custom user agent string</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveConfig}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>
                </div>
              )}

              {/* Advanced Settings */}
              {activeTab === 'advanced' && (
                <div className="space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <h3 className="text-lg font-medium text-yellow-800">Advanced Settings</h3>
                    </div>
                    <p className="text-sm text-yellow-700">
                      These settings are for advanced users. Modify with caution as they can significantly impact crawler performance and behavior.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Bloom Filter Capacity
                      </label>
                      <input
                        type="number"
                        min="1000"
                        value={config.bloom_capacity || 100000}
                        onChange={(e) => updateConfig('bloom_capacity', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'border-stone-600 bg-stone-700 text-stone-100' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>Bloom filter capacity for URL deduplication</p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Bloom Filter Error Rate
                      </label>
                      <input
                        type="number"
                        min="0.001"
                        max="0.1"
                        step="0.001"
                        value={config.bloom_error_rate || 0.01}
                        onChange={(e) => updateConfig('bloom_error_rate', parseFloat(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'border-stone-600 bg-stone-700 text-stone-100' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>Bloom filter false positive rate (0.001-0.1)</p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Idle Shutdown Threshold
                      </label>
                      <input
                        type="number"
                        min="10"
                        value={config.idle_shutdown_threshold || 300}
                        onChange={(e) => updateConfig('idle_shutdown_threshold', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'border-stone-600 bg-stone-700 text-stone-100' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>Seconds of inactivity before auto-shutdown</p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Metrics Interval
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={config.metrics_interval || 60}
                        onChange={(e) => updateConfig('metrics_interval', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'border-stone-600 bg-stone-700 text-stone-100' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>Seconds between metrics updates</p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Request Timeout
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={config.request_timeout || 30}
                        onChange={(e) => updateConfig('request_timeout', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'border-stone-600 bg-stone-700 text-stone-100' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>HTTP request timeout in seconds</p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Max Connections
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={config.max_connections || 10}
                        onChange={(e) => updateConfig('max_connections', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'border-stone-600 bg-stone-700 text-stone-100' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-gray-500'} mt-1`}>Maximum concurrent connections</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveConfig}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>
                </div>
              )}

              {/* Domain Management */}
              {activeTab === 'domains' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-medium text-blue-800">Domain Management</h3>
                    </div>
                    <p className="text-sm text-blue-700">
                      Manage allowed domains for crawling. Only URLs from these domains will be crawled.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Add New Domain
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value)}
                          placeholder="example.com"
                          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode 
                              ? 'border-stone-600 bg-stone-700 text-stone-100' 
                              : 'border-gray-300 bg-white text-gray-900'
                          }`}
                        />
                        <button
                          onClick={handleAddDomain}
                          disabled={!newDomain.trim()}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-stone-300' : 'text-gray-700'} mb-2`}>
                        Allowed Domains ({allowedDomains.length})
                      </label>
                      <div className="space-y-2">
                        {allowedDomains.length === 0 ? (
                          <p className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-gray-500'}`}>No domains configured</p>
                        ) : (
                          allowedDomains.map((domain, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-gray-900'}`}>{domain}</span>
                              <button
                                onClick={() => handleRemoveDomain(domain)}
                                className="flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remove
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 