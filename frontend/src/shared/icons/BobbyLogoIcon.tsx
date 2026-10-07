import React from 'react';

const BobbyLogoIcon: React.FC<{ className?: string; size?: number }> = ({ className = 'w-8 h-8', size = 32 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    className={className}
    aria-hidden="true"
    style={{ filter: 'drop-shadow(0 2px 8px rgba(127, 86, 217, 0.35))' }}
  >
    <defs>
      <linearGradient id="bobby-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="55%" stopColor="#7F56D9" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#bobby-logo-grad)" />
    <path
      d="M10 8h6a5 5 0 0 1 3.8 8.25A5 5 0 0 1 17 25h-7V8Zm4 4v3h2a1.5 1.5 0 0 0 0-3h-2Zm0 7v2h3a1 1 0 0 0 0-2h-3Z"
      fill="white"
    />
    <path
      d="m24 5 .8 2.2L27 8l-2.2.8L24 11l-.8-2.2L21 8l2.2-.8L24 5Z"
      fill="white"
      opacity="0.95"
    />
  </svg>
);

export default BobbyLogoIcon;
