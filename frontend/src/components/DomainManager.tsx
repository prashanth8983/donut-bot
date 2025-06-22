import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Plus, Trash2 } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';

export const DomainManager: React.FC = () => {
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const { showNotification, isDarkMode } = useDashboard();

  const fetchDomains = async () => {
    setLoading(true);
    setError(null);
    const response = await apiService.getAllowedDomains();
    if (response.success && response.data) {
      setDomains(response.data.allowed_domains);
    } else {
      setError(response.error || 'Failed to fetch domains');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    const response = await apiService.updateAllowedDomains('add', [newDomain.trim()]);
    if (response.success) {
      showNotification('Domain added successfully', 'success');
      setNewDomain('');
      fetchDomains();
    } else {
      showNotification(`Failed to add domain: ${response.error}`, 'error');
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    const response = await apiService.updateAllowedDomains('remove', [domain]);
    if (response.success) {
      showNotification('Domain removed successfully', 'success');
      fetchDomains();
    } else {
      showNotification(`Failed to remove domain: ${response.error}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className={`${isDarkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'} p-6 rounded-lg border`}>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-stone-100' : 'text-gray-900'} mb-2`}>Domain Manager</h1>
        <p className={`${isDarkMode ? 'text-stone-400' : 'text-gray-600'} mb-4`}>Manage allowed domains for the crawler.</p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            placeholder="Add new domain (e.g. example.com)"
            className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode 
                ? 'border-stone-600 bg-stone-700 text-stone-100 placeholder-stone-400' 
                : 'border-gray-300 bg-white text-gray-900'
            }`}
          />
          <button
            onClick={handleAddDomain}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={!newDomain.trim()}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        {loading ? (
          <div className={`animate-pulse h-8 ${isDarkMode ? 'bg-stone-600' : 'bg-gray-200'} rounded w-1/2 mb-2`}></div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <ul className={`divide-y ${isDarkMode ? 'divide-stone-600' : 'divide-gray-200'}`}>
            {domains.length === 0 ? (
              <li className={`py-4 ${isDarkMode ? 'text-stone-400' : 'text-gray-500'} text-center`}>No domains configured.</li>
            ) : (
              domains.map(domain => (
                <li key={domain} className="flex items-center justify-between py-2">
                  <span className={`${isDarkMode ? 'text-stone-100' : 'text-gray-900'} font-medium`}>{domain}</span>
                  <button
                    onClick={() => handleRemoveDomain(domain)}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="Remove domain"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}; 