import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, RefreshCw, Plus, Trash2, AlertTriangle, SlidersHorizontal, Globe, Cpu, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import type { CrawlerConfig } from '../types';
import { useDashboard } from '../contexts/DashboardContext';
import Card from './ui/Card';

interface TabButtonProps {
  id: string;
  label: string;
  icon: React.ReactElement;
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export const ConfigurationPanel: React.FC = () => {
  const { showNotification, isDarkMode } = useDashboard();
  const [config, setConfig] = useState<Partial<CrawlerConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getConfig();
      if (response.success) {
        setConfig(response.data || {});
      } else {
        showNotification(`Failed to load config: ${response.error}`, 'error');
      }
    } catch (error) {
      showNotification(`Failed to load config: ${(error as Error).message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const response = await apiService.updateConfig(config as CrawlerConfig);
      if (response.success) {
        showNotification('Configuration saved successfully', 'success');
      } else {
        showNotification(`Failed to save config: ${response.error}`, 'error');
      }
    } catch (error) {
      showNotification(`Failed to save config: ${(error as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: keyof CrawlerConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const renderField = (label: string, key: keyof CrawlerConfig, type: string, props: any = {}) => (
    <div>
        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>{label}</label>
        <input
            type={type}
            value={config[key] ?? ''}
            onChange={(e) => updateConfig(key, type === 'number' ? Number(e.target.value) : e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? 'bg-zinc-800/80 border-zinc-700' : 'bg-white/80 border-slate-300'}`}
            {...props}
        />
    </div>
  );

  return (
    <Card>
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <Settings className="w-7 h-7 text-sky-500" />
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>Crawler Configuration</h2>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={fetchConfig} disabled={loading} className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}><RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} /></button>
                <button onClick={handleSaveConfig} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 shadow-md hover:shadow-lg disabled:opacity-50">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save
                </button>
            </div>
        </div>

        <div className={`border-b mb-6 ${isDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
            <div className="flex gap-6">
                <TabButton id="general" label="General" icon={<SlidersHorizontal/>} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="performance" label="Performance" icon={<Cpu/>} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="advanced" label="Advanced" icon={<AlertTriangle/>} activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
        </div>

        {loading ? <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500" /></div> : 
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === 'general' && <> 
                    {renderField('User Agent', 'user_agent', 'text', { placeholder: 'DonutBot/1.0' })}
                    {renderField('Max Pages', 'max_pages', 'number', { min: 0, placeholder: '1000' })}
                    {renderField('Max Depth', 'max_depth', 'number', { min: 0, placeholder: '5' })}
                </>}
                {activeTab === 'performance' && <>
                    {renderField('Workers', 'workers', 'number', { min: 1, placeholder: '4' })}
                    {renderField('Delay (ms)', 'delay', 'number', { min: 0, placeholder: '1000' })}
                    {renderField('Request Timeout (s)', 'request_timeout', 'number', { min: 1, placeholder: '30' })}
                    {renderField('Max Connections', 'max_connections', 'number', { min: 1, placeholder: '10' })}
                </>}
                {activeTab === 'advanced' && <>
                    {renderField('Bloom Filter Capacity', 'bloom_capacity', 'number', { min: 1000, placeholder: '1000000' })}
                    {renderField('Bloom Filter Error Rate', 'bloom_error_rate', 'number', { min: 0.0001, max: 0.1, step: 0.0001, placeholder: '0.001' })}
                    {renderField('Idle Shutdown Threshold (s)', 'idle_shutdown_threshold', 'number', { min: 0, placeholder: '300' })}
                </>}
            </div>
        }
    </Card>
  );
};

const TabButton: React.FC<TabButtonProps> = ({ id, label, icon, activeTab, setActiveTab }) => {
  const { isDarkMode } = useDashboard();
  return (
    <button 
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-2 pb-3 border-b-2 transition-all duration-200 ${activeTab === id ? 'border-sky-500 text-sky-500' : `border-transparent ${isDarkMode ? 'text-zinc-500 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-700'}`}`}>
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
        <span className="font-semibold">{label}</span>
    </button>
  );
}; 