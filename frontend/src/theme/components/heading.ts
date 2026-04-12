import { mode } from '@chakra-ui/theme-tools';
import { ThemeComponentProps } from '@chakra-ui/react';

const Heading = {
  baseStyle: (props: ThemeComponentProps) => ({
    color: mode('black', 'white')(props),
  }),
  variants: {
    solid: (props: ThemeComponentProps) => ({
      bg: mode('primary.500', 'primary.500')(props),
      color: mode('red', 'primary.500')(props),
    }),
  },
  sizes: {
    md: {
      fontSize: '20px',
      fontWeight: '600',
    },
  },
};

export default Heading;

