import { extendTheme } from '@chakra-ui/react';
import { mode, StyleFunctionProps } from '@chakra-ui/theme-tools';

import Button from './components/button';
import Radio from './components/radio';
import Badge from './components/badge';
import Link from './components/link';
import Heading from './components/heading';
import { colors } from './components/colors';
import Modal from './components/modal';
import Select from './components/select';
import Tooltip from './components/tooltip';
import Input from './components/input';
import Textarea from './components/textarea';

const theme = extendTheme({
  colors,
  fonts: {
    heading: `'Space Grotesk Variable', 'Space Grotesk', 'Inter Variable', 'Inter', -apple-system, sans-serif`,
    body: `'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  },
  semanticTokens: {
    colors: {
      // Backgrounds
      'bg.canvas': {
        default: 'zinc.50',
        _dark: 'zinc.950',
      },
      'bg.surface': {
        default: 'white',
        _dark: 'zinc.800',
      },
      'bg.subtle': {
        default: 'zinc.100',
        _dark: 'zinc.900',
      },
      'bg.muted': {
        default: 'zinc.150',
        _dark: 'zinc.700',
      },
      
      // Text
      'text.primary': {
        default: 'zinc.900',
        _dark: 'white',
      },
      'text.secondary': {
        default: 'zinc.600',
        _dark: 'zinc.400',
      },
      'text.muted': {
        default: 'zinc.500',
        _dark: 'zinc.400',
      },
      'text.subtle': {
        default: 'zinc.400',
        _dark: 'zinc.500',
      },
      'text.inverted': {
        default: 'white',
        _dark: 'black',
      },

      // Borders
      'border.default': {
        default: 'zinc.200',
        _dark: 'zinc.700',
      },
      'border.subtle': {
        default: 'zinc.100',
        _dark: 'zinc.800',
      },
      'border.muted': {
        default: 'zinc.200',
        _dark: 'zinc.700',
      },
      'border.glow': {
        default: 'brand.300',
        _dark: 'brand.500',
      },
      
      // Brand Aliases
      'brand.main': 'brand.600',
      'brand.hover': 'brand.700',
      'brand.active': 'brand.800',
    },
  },
  components: {
    Heading,
    Link,
    Button,
    Badge,
    Radio,
    Modal,
    Select,
    Tooltip,
    Input,
    Textarea,
    Menu: {
      baseStyle: (props: { colorMode: string }) => ({
        list: {
          bg: 'bg.surface',
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: '14px',
          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(12px)',
          py: 2,
        },
        item: {
          bg: 'transparent',
          color: 'text.primary',
          borderRadius: '8px',
          mx: 1,
          w: 'calc(100% - 8px)',
          _hover: {
            bg: 'bg.subtle',
          },
          _focus: {
            bg: 'bg.subtle',
          },
        },
      }),
    },
  },
  styles: {
    global: (props: StyleFunctionProps) => ({
      body: {
        bg: 'bg.canvas',
        color: 'text.primary',
        fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
      },
    }),
  },
});

export default theme;
