import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopyright } from '@fortawesome/free-solid-svg-icons';
import { useDashboard } from '../../contexts/DashboardContext';

const Footer: React.FC = () => {
  const { isDarkMode } = useDashboard();
  
  return (
    <div className={`fixed bottom-2 right-4 text-xs ${isDarkMode ? 'text-stone-400' : 'text-gray-500'}`}>
      <FontAwesomeIcon icon={faCopyright} className="mr-1" size="xs" />
      Donut Bot
    </div>
  );
};

export default Footer; 