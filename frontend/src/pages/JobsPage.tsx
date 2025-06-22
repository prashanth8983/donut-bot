import React from 'react';
import { CrawlerControls } from '../components/CrawlerControls';
import { Jobs } from '../components/Jobs';

const JobsPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <CrawlerControls />
            <Jobs />
        </div>
    );
};

export default JobsPage; 