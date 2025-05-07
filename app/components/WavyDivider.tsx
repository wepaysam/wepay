import React from 'react';

interface WavyDividerProps {
  position: 'top' | 'bottom';
  color?: string;
  height?: number;
}

const WavyDivider: React.FC<WavyDividerProps> = ({ 
  position = 'bottom', 
  color = '#ffffff',
  height = 100 
}) => {
  return (
    <div 
      className={`absolute ${position}-0 left-0 w-full overflow-hidden`} 
      style={{ height: `${height}px` }}
    >
      <svg
        className="absolute w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 1440 100"
        style={{ 
          transform: position === 'top' ? 'rotate(180deg)' : 'none',
          fill: color
        }}
      >
        <path
          d="M0,0 C240,95 480,95 720,45 C960,-5 1200,-5 1440,45 L1440,100 L0,100 Z"
        />
      </svg>
    </div>
  );
};

export default WavyDivider;
