import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';

const CopyIcon: React.FC = () => {
  const iconColor = useColorModeValue('#212529', '#FFFFFF');

  return (
    <div>
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_6128_93738)">
          <path
            d="M16.167 24.5013H15.3337C14.8916 24.5013 14.4677 24.3257 14.1551 24.0131C13.8426 23.7006 13.667 23.2767 13.667 22.8346V15.3346C13.667 14.8926 13.8426 14.4687 14.1551 14.1561C14.4677 13.8436 14.8916 13.668 15.3337 13.668H22.8337C23.2757 13.668 23.6996 13.8436 24.0122 14.1561C24.3247 14.4687 24.5003 14.8926 24.5003 15.3346V16.168M21.167 19.5013H28.667C29.5875 19.5013 30.3337 20.2475 30.3337 21.168V28.668C30.3337 29.5884 29.5875 30.3346 28.667 30.3346H21.167C20.2465 30.3346 19.5003 29.5884 19.5003 28.668V21.168C19.5003 20.2475 20.2465 19.5013 21.167 19.5013Z"
            stroke={iconColor}
            strokeWidth="1.66667"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <defs>
          <clipPath id="clip0_6128_93738">
            <rect
              width="20"
              height="20"
              fill="white"
              transform="translate(12 12)"
            />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
};

export default CopyIcon;
