import { mode } from "@chakra-ui/theme-tools";
import { ThemeComponentProps } from "@chakra-ui/react";

const Select = {
  baseStyle: (props: { colorMode: string; }) => ({
    field: {
      borderColor: props.colorMode === 'dark' ? '#2d3748' : '#e2e8f0',
      backgroundColor: props.colorMode === 'dark' ? '#0e0e0e' : '#ffffff',
      color: props.colorMode === 'dark' ? 'white' : 'black',
      _hover: {
        borderColor: props.colorMode === 'dark' ? '#2d3748' : '#e2e8f0',
      },
      _focusVisible: {
        borderColor: '#2E2E2E',
        boxShadow: 'none',
      },
    },
    icon: {
      color: props.colorMode === 'dark' ? 'white' : 'black',
    },
    menu: {
      bg: props.colorMode === 'dark' ? 'green' : '#ffffff',
      zIndex: 9999,
    },
  }),
  variants: {
    filled: (props: { colorMode: string; }) => ({
      field: {
        bg: props.colorMode === 'dark' ? '#0e0e0e' : '#ffffff',
        _hover: {
          bg: props.colorMode === 'dark' ? '#0e0e0e' : '#ffffff',
          borderColor: props.colorMode === 'dark' ? '#2d3748' : '#e2e8f0',
        },
        _focus: {
          bg: props.colorMode === 'dark' ? '#0e0e0e' : '#ffffff',
          borderColor: '#2E2E2E',
        },
      },
    }),
  },
  parts: ['field', 'icon', 'menu'],
};

export default Select;

