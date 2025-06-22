import React, { useState } from 'react';
import { ConfigurationPanel } from '../components/ConfigurationPanel';

const SettingsPage: React.FC = () => {
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Settings</h1>
                <button
                    onClick={() => setIsConfigOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Open Crawler Configuration
                </button>
            </div>
            <p>
                Manage your crawler's configuration. Click the button to open the settings panel.
            </p>

            <ConfigurationPanel
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
            />
        </div>
    );
};

export default SettingsPage; 