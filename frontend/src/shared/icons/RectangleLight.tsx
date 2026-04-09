import React from 'react';

const RectangleLight: React.FC = ({}) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_9077_137304)">
        <rect width="16" height="16" transform="translate(0 0.000976562)" fill="white" fillOpacity="0.01" />
        <path
          d="M1.00195 1.23297V14.7714C1.00195 15.0978 1.13162 15.4109 1.36244 15.6417C1.59325 15.8725 1.9063 16.0022 2.23272 16.0022H13.3096C13.6361 16.0022 13.9491 15.8725 14.1799 15.6417C14.4107 15.4109 14.5404 15.0978 14.5404 14.7714V1.23297C14.5404 0.906546 14.4107 0.593495 14.1799 0.362681C13.9491 0.131867 13.6361 0.00219727 13.3096 0.00219727H2.23272C1.9063 0.00219727 1.59325 0.131867 1.36244 0.362681C1.13162 0.593495 1.00195 0.906546 1.00195 1.23297ZM13.3096 1.23297V14.7714H2.23272V1.23297H13.3096Z"
          fill="#6C757D"
        />
      </g>
      <defs>
        <clipPath id="clip0_9077_137304">
          <rect width="16" height="16" fill="white" transform="translate(0 0.000976562)" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default React.memo(RectangleLight);

