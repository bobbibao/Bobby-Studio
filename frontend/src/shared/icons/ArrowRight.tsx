import { useColorMode } from '@chakra-ui/react';

interface ArrowRightProps {
  color?: string;
}

const ArrowRight = ({ color }: ArrowRightProps) => {
  const { colorMode } = useColorMode();
  const defaultColor = colorMode === 'dark' ? 'white' : 'black'; // Default to theme-aware colors

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
    >
      <g clipPath="url(#clip0_3022_59466)">
        <rect
          width="16"
          height="16"
          transform="translate(0.499023 0.5)"
          fill="white"
          fillOpacity="0.01"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M1.49902 8.49965C1.49902 8.36705 1.5517 8.23987 1.64547 8.1461C1.73924 8.05233 1.86642 7.99965 1.99902 7.99965H13.792L10.645 4.85366C10.5511 4.75977 10.4984 4.63243 10.4984 4.49966C10.4984 4.36688 10.5511 4.23954 10.645 4.14565C10.7389 4.05177 10.8662 3.99902 10.999 3.99902C11.1318 3.99902 11.2591 4.05177 11.353 4.14565L15.353 8.14565C15.3996 8.1921 15.4365 8.24728 15.4617 8.30802C15.4869 8.36877 15.4999 8.43389 15.4999 8.49965C15.4999 8.56542 15.4869 8.63054 15.4617 8.69129C15.4365 8.75203 15.3996 8.80721 15.353 8.85365L11.353 12.8537C11.2591 12.9475 11.1318 13.0003 10.999 13.0003C10.8662 13.0003 10.7389 12.9475 10.645 12.8537C10.5511 12.7598 10.4984 12.6324 10.4984 12.4997C10.4984 12.3669 10.5511 12.2395 10.645 12.1457L13.792 8.99965H1.99902C1.86642 8.99965 1.73924 8.94698 1.64547 8.85321C1.5517 8.75944 1.49902 8.63226 1.49902 8.49965Z"
          fill={color || defaultColor} // Use prop color or default
        />
      </g>
      <defs>
        <clipPath id="clip0_3022_59466">
          <rect
            width="16"
            height="16"
            fill="white"
            transform="translate(0.499023 0.5)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

export default ArrowRight;
