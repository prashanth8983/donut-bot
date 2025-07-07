import React from 'react';

interface DonutIconProps {
  size?: number;
  className?: string;
}

const DonutIcon: React.FC<DonutIconProps> = ({ size = 32, className = '' }) => {
  return (
    <div 
      className={`donut-icon ${className}`}
      style={{ 
        width: `${size}px`, 
        height: `${size}px` 
      }}
    />
  );
};

export default DonutIcon; 