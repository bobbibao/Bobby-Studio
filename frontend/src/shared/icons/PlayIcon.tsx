import { Icon, IconProps } from '@chakra-ui/react';

const PlayIcon = (props: IconProps) => {

  return (
        <Icon
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <g clipPath="url(#clip0_3117_54778)">
            <rect
              width="32"
              height="32"
              transform="translate(0 0.332031)"
              fill="white"
              fillOpacity="0.01"
            />
            <path
              d="M24.2839 17.838L13.3199 27.43C12.0279 28.562 10.0039 27.642 10.0039 25.924V6.74C10.0036 6.35551 10.1141 5.97907 10.3222 5.65577C10.5303 5.33247 10.8272 5.07601 11.1773 4.9171C11.5274 4.75819 11.9159 4.70356 12.2963 4.75977C12.6766 4.81597 13.0327 4.98062 13.3219 5.234L24.2819 14.826C24.4967 15.0137 24.6689 15.2452 24.7869 15.505C24.9048 15.7647 24.9659 16.0467 24.9659 16.332C24.9659 16.6173 24.9048 16.8993 24.7869 17.159C24.6689 17.4188 24.4967 17.6503 24.2819 17.838H24.2839Z"
              fill="white"
            />
          </g>
          <defs>
            <clipPath id="clip0_3117_54778">
              <rect
                width="32"
                height="32"
                fill="white"
                transform="translate(0 0.332031)"
              />
            </clipPath>
          </defs>
        </Icon>
   
  );
};

export default PlayIcon;

