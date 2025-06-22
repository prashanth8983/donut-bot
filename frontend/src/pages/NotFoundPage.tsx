import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h1 className="text-6xl font-bold text-gray-800">404</h1>
            <p className="text-xl text-gray-600 mt-4">Page Not Found</p>
            <p className="text-md text-gray-500 mt-2">
                Sorry, the page you are looking for does not exist.
            </p>
            <Link
                to="/dashboard"
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
                Go to Dashboard
            </Link>
        </div>
    );
};

export default NotFoundPage; 