import React from 'react';

const DonutLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 40 }) => (
  <div
    className={`donut-icon ${className}`}
    style={{ width: size, height: size }}
    aria-label="Donut-Bot Logo"
  />
);

export default DonutLogo; 