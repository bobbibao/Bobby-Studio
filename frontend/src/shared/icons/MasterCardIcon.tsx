import { useColorModeValue } from '@chakra-ui/react';
import React from 'react';

interface MasterCardIconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

const MASTERCARD_COLORS = {
  red: {
    light: '#ED0006',
    dark: '#FF1A1F'  // slightly brighter red for dark mode
  },
  yellow: {
    light: '#F9A000',
    dark: '#FFB224'  // slightly brighter yellow for dark mode
  },
  orange: {
    light: '#FF5E00',
    dark: '#FF7A2E'  // slightly brighter orange for dark mode
  }
};

const MasterCardIcon = ({ width = 38, height = 23, className }: MasterCardIconProps) => {
  const redColor = useColorModeValue(MASTERCARD_COLORS.red.light, MASTERCARD_COLORS.red.dark);
  const yellowColor = useColorModeValue(MASTERCARD_COLORS.yellow.light, MASTERCARD_COLORS.yellow.dark);
  const orangeColor = useColorModeValue(MASTERCARD_COLORS.orange.light, MASTERCARD_COLORS.orange.dark);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 38 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.6316 20.0486C16.6582 21.712 14.0984 22.7161 11.3011 22.7161C5.0597 22.7161 0 17.7167 0 11.5495C0 5.3823 5.0597 0.382812 11.3011 0.382812C14.0984 0.382812 16.6582 1.38698 18.6316 3.05038C20.605 1.38698 23.1649 0.382812 25.9621 0.382812C32.2036 0.382812 37.2632 5.3823 37.2632 11.5495C37.2632 17.7167 32.2036 22.7161 25.9621 22.7161C23.1649 22.7161 20.605 21.712 18.6316 20.0486Z"
        fill={redColor}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.6316 20.0486C21.0615 18.0004 22.6023 14.9527 22.6023 11.5495C22.6023 8.14622 21.0615 5.09855 18.6316 3.05038C20.605 1.38697 23.1649 0.382812 25.9621 0.382812C32.2035 0.382812 37.2632 5.3823 37.2632 11.5495C37.2632 17.7167 32.2035 22.7161 25.9621 22.7161C23.1649 22.7161 20.605 21.712 18.6316 20.0486Z"
        fill={yellowColor}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.6318 20.0489C21.0616 18.0007 22.6024 14.9531 22.6024 11.5498C22.6024 8.14661 21.0616 5.09895 18.6318 3.05078C16.2019 5.09895 14.6611 8.14661 14.6611 11.5498C14.6611 14.9531 16.2019 18.0007 18.6318 20.0489Z"
        fill={orangeColor}
      />
    </svg>
  );
};

export default React.memo(MasterCardIcon);
