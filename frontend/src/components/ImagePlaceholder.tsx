import React from 'react';

interface ImagePlaceholderProps {
  dimensions?: string;
  className?: string;
  borderRadius?: string;
}

export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ dimensions, className = '', borderRadius = 'rounded-lg' }) => {
  // Default dimensions if none provided (16:9 aspect ratio)
  const defaultWidth = 1980;
  const defaultHeight = 960;

  // Calculate aspect ratio
  const aspectRatio = dimensions ? dimensions.split('x').map(Number) : [defaultWidth, defaultHeight];
  const [width, height] = aspectRatio;

  return (
    <div
      className={`relative overflow-hidden ${borderRadius} ${className}`}
      style={{
        aspectRatio: aspectRatio.toString(),
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />

      {/* Shimmer overlay effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>

      {/* Blur overlay */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{
          background: `linear-gradient(45deg, 
            rgba(156, 163, 175, 0.1) 0%, 
            rgba(209, 213, 219, 0.2) 25%, 
            rgba(243, 244, 246, 0.1) 50%, 
            rgba(209, 213, 219, 0.2) 75%, 
            rgba(156, 163, 175, 0.1) 100%)`,
          backgroundSize: '200% 200%',
          animation: 'gradientShift 3s ease-in-out infinite',
        }}
      />

      {/* Optional subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full bg-repeat"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fillOpacity='0.1'%3E%3Cpath d='m0 40l40-40h-40v40zm40 0v-40h-40l40 40z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '20px 20px',
          }}
        />
      </div>
    </div>
  );
};

