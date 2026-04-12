import { mode } from "@chakra-ui/theme-tools";
import { ThemeComponentProps } from "@chakra-ui/react";
import { radioAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const { definePartsStyle } =
  createMultiStyleConfigHelpers(radioAnatomy.keys);

const Radio = {
  baseStyle: (props: ThemeComponentProps) => ({
    control: {
      borderWidth: '1px',
      borderColor: mode('#E0E0E0', '#2E2E2E')(props),
      transition: 'all 0.2s',
      _checked: {
        borderColor: 'primary.500',
        backgroundColor: 'primary.500',
        color: mode('#FFFFFF', '#0E0E0E')(props),
        _before: {
          bg: mode('#FFFFFF', '#0E0E0E')(props),
        }
      },
      _hover: {
        borderColor: 'primary.500',
      },
      _focus: {
        boxShadow: 'none',
      },
      _disabled: {
        borderColor: mode('gray.200', 'gray.600')(props),
        backgroundColor: mode('gray.100', 'gray.700')(props),
        _hover: {
          borderColor: mode('gray.200', 'gray.600')(props),
        }
      },
    },
    label: {
      _disabled: {
        opacity: 0.4,
      }
    }
  }),

  sizes: {
    sm: definePartsStyle({
      control: { w: '14px', h: '14px' },
      label: { fontSize: 'sm' }
    }),
    md: definePartsStyle({
      control: { w: '18px', h: '18px' },
      label: { fontSize: 'md' }
    }),
    lg: definePartsStyle({
      control: { w: '20px', h: '20px' },
      label: { fontSize: 'lg' }
    })
  }
}
export default Radio;
