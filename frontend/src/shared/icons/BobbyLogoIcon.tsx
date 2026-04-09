import React from 'react';

const BobbyLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" fill="none" viewBox="0 0 300 300" className={className}>
      <path
        fill="currentColor"
        d="M300 0H150v150h150zM0 150v40.662l82.907-.054L0 273.315V300h27.273l82.048-82.27-.325 82.27H150V150z"
      ></path>
    </svg>
  );
};

export default BobbyLogoIcon;

