import React from 'react';
import { DomainManager } from '../components/DomainManager';
import { UrlManager } from '../components/UrlManager';

const DomainManagerPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <DomainManager />
      <UrlManager />
    </div>
  );
};

export default DomainManagerPage; 