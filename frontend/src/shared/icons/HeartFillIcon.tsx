import React from 'react';
import { useColorMode } from '@chakra-ui/react';

const HeartFillIcon = ({ active, height = 12, width = 12 }: { active: boolean; height?: number; width?: number }) => {
  if (active) {
    return (
      <svg width={width} height={height} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.00179 1.73554C9.33029 -1.68596 17.6523 4.30129 6.00179 12C-5.64871 4.30204 2.67329 -1.68596 6.00179 1.73554Z"
          fill="white"
        />
      </svg>
    );
  }
  return (
    <svg width={width} height={height} viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_4373_14848)">
        <rect width="12" height="12" transform="translate(0.5 0.75)" fill="white" fillOpacity="0.01" />
        <path
          d="M6.50163 2.81104L5.96388 2.25829C4.70163 0.960786 2.38713 1.40854 1.55163 3.03979C1.15938 3.80704 1.07088 4.91479 1.78713 6.32854C2.47713 7.68979 3.91263 9.32029 6.50163 11.0963C9.09063 9.32029 10.5254 7.68979 11.2161 6.32854C11.9324 4.91404 11.8446 3.80704 11.4516 3.03979C10.6161 1.40854 8.30163 0.960036 7.03938 2.25754L6.50163 2.81104ZM6.50163 12C-4.99812 4.40104 2.96088 -1.52996 6.36963 1.60729C6.41463 1.64854 6.45888 1.69129 6.50163 1.73554C6.54395 1.69133 6.58798 1.64879 6.63363 1.60804C10.0416 -1.53146 18.0014 4.40029 6.50163 12Z"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id="clip0_4373_14848">
          <rect width="12" height="12" fill="white" transform="translate(0.5 0.75)" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default React.memo(HeartFillIcon);

