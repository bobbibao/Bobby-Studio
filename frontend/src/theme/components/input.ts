import { mode } from "@chakra-ui/theme-tools";
import { ThemeComponentProps } from "@chakra-ui/react";

const Input = {
  baseStyle: (props: ThemeComponentProps) => ({
    field: {
      _focus: {
        borderColor: mode('zinc.600', 'zinc.500')(props),
        boxShadow: `0 0 0 1px ${mode('#525252', '#737373')(props)}`, // zinc.600 or zinc.500
      },
      _focusVisible: {
        borderColor: mode('zinc.600', 'zinc.500')(props),
        boxShadow: `0 0 0 1px ${mode('#525252', '#737373')(props)}`, // zinc.600 or zinc.500
      },
    },
  }),
  variants: {
    outline: (props: ThemeComponentProps) => ({
      field: {
        _focus: {
          borderColor: mode('zinc.600', 'zinc.500')(props),
          boxShadow: `0 0 0 1px ${mode('#525252', '#737373')(props)}`,
        },
      },
    }),
    filled: (props: ThemeComponentProps) => ({
      field: {
        _focus: {
          borderColor: mode('zinc.600', 'zinc.500')(props),
          boxShadow: `0 0 0 1px ${mode('#525252', '#737373')(props)}`,
        },
      },
    }),
    flushed: (props: ThemeComponentProps) => ({
      field: {
        _focus: {
          borderColor: mode('zinc.600', 'zinc.500')(props),
        },
      },
    }),
    unstyled: {},
  },
  defaultProps: {
    focusBorderColor: 'zinc.600',
  },
  parts: ['field', 'addon'],
};

export default Input;


