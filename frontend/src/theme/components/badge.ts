import { mode } from "@chakra-ui/theme-tools";
import { ThemeComponentProps } from "@chakra-ui/react";

const Badge = {
  baseStyle: (props: ThemeComponentProps) => ({
    textTransform: 'none',
    borderRadius: '24px',
    fontSize: '12px',
    fontWeight: 'medium',
    lineHeight: '1',
    padding: '4px 8px',
    bg: mode(
      props.colorScheme === 'purple'
        ? 'purple.100'
        : props.colorScheme === 'blue'
          ? 'blue.100'
          : props.colorScheme === 'red'
            ? 'red.100'
            : props.colorScheme === 'green'
              ? 'green.100'
              : 'white',
      props.colorScheme === 'purple'
        ? 'purple.200'
        : props.colorScheme === 'blue'
          ? 'blue.200'
          : props.colorScheme === 'red'
            ? 'red.200'
            : props.colorScheme === 'green'
              ? 'green.200'
              : 'black'
    )(props),
    color: mode(
      props.colorScheme === 'purple'
        ? 'purple.500'
        : props.colorScheme === 'blue'
          ? 'blue.500'
          : props.colorScheme === 'red'
            ? 'red.500'
            : props.colorScheme === 'green'
              ? 'green.500'
              : 'black',
      props.colorScheme === 'purple'
        ? 'purple.600'
        : props.colorScheme === 'blue'
          ? 'blue.600'
          : props.colorScheme === 'red'
            ? 'red.600'
            : props.colorScheme === 'green'
              ? 'green.600'
              : 'white'
    )(props),
  }),
};

export default Badge;

