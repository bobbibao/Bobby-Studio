import { useColorMode } from '@chakra-ui/react';
import { SVGProps } from 'react';

interface ChevronLeftIconProps extends SVGProps<SVGSVGElement> {
  color?: string;
}

const ChevronLeftIcon = ({ color, ...props }: ChevronLeftIconProps) => {
  const { colorMode } = useColorMode();
  const defaultColor = colorMode === 'dark' ? 'white' : 'black';
  const fillColor = color || defaultColor;

  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.3539 1.64494C11.4005 1.69139 11.4374 1.74656 11.4626 1.80731C11.4878 1.86805 11.5008 1.93317 11.5008 1.99894C11.5008 2.06471 11.4878 2.12983 11.4626 2.19057C11.4374 2.25132 11.4005 2.3065 11.3539 2.35294L5.70692 7.99894L11.3539 13.6449C11.4478 13.7388 11.5005 13.8662 11.5005 13.9989C11.5005 14.1317 11.4478 14.2591 11.3539 14.3529C11.26 14.4468 11.1327 14.4996 10.9999 14.4996C10.8671 14.4996 10.7398 14.4468 10.6459 14.3529L4.64592 8.35294C4.59935 8.30649 4.56241 8.25132 4.5372 8.19057C4.512 8.12983 4.49902 8.06471 4.49902 7.99894C4.49902 7.93317 4.512 7.86805 4.5372 7.80731C4.56241 7.74656 4.59935 7.69139 4.64592 7.64494L10.6459 1.64494C10.6924 1.59838 10.7475 1.56143 10.8083 1.53623C10.869 1.51102 10.9341 1.49805 10.9999 1.49805C11.0657 1.49805 11.1308 1.51102 11.1916 1.53623C11.2523 1.56143 11.3075 1.59838 11.3539 1.64494Z"
        fill={fillColor}
      />
    </svg>
  );
};

export default ChevronLeftIcon;
