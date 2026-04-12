import { mode } from "@chakra-ui/theme-tools";
import { ThemeComponentProps } from "@chakra-ui/react";

const Textarea = {
  baseStyle: (props: ThemeComponentProps) => ({
    borderWidth: '1px',
    _focus: {
      borderColor: mode('zinc.600', 'zinc.500')(props),
      borderWidth: '1px',
      boxShadow: 'none',
      outline: 'none',
    },
    _focusVisible: {
      borderColor: mode('zinc.600', 'zinc.500')(props),
      borderWidth: '1px',
      boxShadow: 'none',
      outline: 'none',
    },
    _hover: {
      borderWidth: '1px',
    },
    _active: {
      borderWidth: '1px',
    },
  }),
  variants: {
    outline: (props: ThemeComponentProps) => ({
      _focus: {
        borderColor: mode('zinc.600', 'zinc.500')(props),
        borderWidth: '1px',
        boxShadow: 'none',
        outline: 'none',
      },
      _hover: {
        borderWidth: '1px',
      },
      _active: {
        borderWidth: '1px',
      },
    }),
    filled: (props: ThemeComponentProps) => ({
      _focus: {
        borderColor: mode('zinc.600', 'zinc.500')(props),
        borderWidth: '1px',
        boxShadow: 'none',
        outline: 'none',
      },
      _hover: {
        borderWidth: '1px',
      },
      _active: {
        borderWidth: '1px',
      },
    }),
    flushed: (props: ThemeComponentProps) => ({
      _focus: {
        borderColor: mode('zinc.600', 'zinc.500')(props),
        borderWidth: '1px',
        boxShadow: 'none',
        outline: 'none',
      },
      _hover: {
        borderWidth: '1px',
      },
      _active: {
        borderWidth: '1px',
      },
    }),
    unstyled: {},
  },
  defaultProps: {
    focusBorderColor: 'zinc.600',
  },
};

export default Textarea;


