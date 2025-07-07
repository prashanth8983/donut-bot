import { useEffect, useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { Plus, Trash2, Globe, Loader2, AlertTriangle } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import Card from './ui/Card';

export const DomainManager: React.FC = () => {
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { showNotification, isDarkMode } = useDashboard();

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getAllowedDomains();
      if (response.success && response.data) {
        setDomains(response.data.allowed_domains);
      } else {
        setError(response.error || 'Failed to fetch domains');
        showNotification(response.error || 'Failed to fetch domains', 'error');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || 'An unknown error occurred';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setActionLoading(true);
    try {
      const response = await apiService.updateAllowedDomains('add', [newDomain.trim()]);
      if (response.success) {
        showNotification('Domain added successfully', 'success');
        setNewDomain('');
        await fetchDomains();
      } else {
        showNotification(`Failed to add domain: ${response.error}`, 'error');
      }
    } catch (err) {
      showNotification(`Failed to add domain: ${(err as Error).message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    if (window.confirm(`Are you sure you want to remove the domain: ${domain}?`)) {
        setActionLoading(true);
        try {
            const response = await apiService.updateAllowedDomains('remove', [domain]);
            if (response.success) {
                showNotification('Domain removed successfully', 'success');
                await fetchDomains();
            } else {
                showNotification(`Failed to remove domain: ${response.error}`, 'error');
            }
        } catch (err) {
            showNotification(`Failed to remove domain: ${(err as Error).message}`, 'error');
        } finally {
            setActionLoading(false);
        }
    }
  };

  return (
    <Card>
        <div className="flex items-center gap-3 mb-6">
            <Globe className="w-7 h-7 text-sky-500" />
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>Allowed Domains</h2>
        </div>
        <form onSubmit={handleAddDomain} className="flex gap-3 mb-4">
            <input
                type="text"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                placeholder="Add new domain (e.g. example.com)"
                className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? 'bg-zinc-800/80 border-zinc-700' : 'bg-white/80 border-slate-300'}`}
            />
            <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-md hover:shadow-lg disabled:opacity-50"
                disabled={!newDomain.trim() || actionLoading}
            >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Add
            </button>
        </form>
        
        {loading ? (
            <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500" /></div>
        ) : error ? (
            <div className="text-center py-8 text-red-500 flex flex-col items-center gap-2">
                <AlertTriangle className="w-8 h-8" />
                <p>Error: {error}</p>
                <button onClick={fetchDomains} className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Retry</button>
            </div>
        ) : (
            <ul className={`divide-y max-h-96 overflow-y-auto pr-2 ${isDarkMode ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                {domains.length === 0 ? (
                    <li className={`py-6 text-center ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>No domains configured.</li>
                ) : (
                    domains.map(domain => (
                        <li key={domain} className="flex items-center justify-between py-3 group">
                            <span className={`font-medium ${isDarkMode ? 'text-zinc-200' : 'text-slate-700'}`}>{domain}</span>
                            <button
                                onClick={() => handleRemoveDomain(domain)}
                                className={`p-2 rounded-full hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-zinc-500 hover:text-red-500' : 'text-slate-400 hover:text-red-500'}`}
                                title="Remove domain"
                                disabled={actionLoading}
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </li>
                    ))
                )}
            </ul>
        )}
    </Card>
  );
}; 