import { useColorMode } from '@chakra-ui/react';
import { SVGProps } from 'react';

interface ChevronRightIconProps extends SVGProps<SVGSVGElement> {
  color?: string;
}

const ChevronRightIcon = ({ color, ...props }: ChevronRightIconProps) => {
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
        d="M4.64592 1.64494C4.69236 1.59838 4.74754 1.56143 4.80828 1.53623C4.86903 1.51102 4.93415 1.49805 4.99992 1.49805C5.06568 1.49805 5.13081 1.51102 5.19155 1.53623C5.2523 1.56143 5.30747 1.59838 5.35392 1.64494L11.3539 7.64494C11.4005 7.69139 11.4374 7.74656 11.4626 7.80731C11.4878 7.86805 11.5008 7.93317 11.5008 7.99894C11.5008 8.06471 11.4878 8.12983 11.4626 8.19057C11.4374 8.25132 11.4005 8.30649 11.3539 8.35294L5.35392 14.3529C5.26003 14.4468 5.13269 14.4996 4.99992 14.4996C4.86714 14.4996 4.7398 14.4468 4.64592 14.3529C4.55203 14.2591 4.49929 14.1317 4.49929 13.9989C4.49929 13.8662 4.55203 13.7388 4.64592 13.6449L10.2929 7.99894L4.64592 2.35294C4.59935 2.3065 4.56241 2.25132 4.5372 2.19057C4.512 2.12983 4.49902 2.06471 4.49902 1.99894C4.49902 1.93317 4.512 1.86805 4.5372 1.80731C4.56241 1.74656 4.59935 1.69139 4.64592 1.64494Z"
        fill={fillColor}
      />
    </svg>
  );
};

export default ChevronRightIcon;
