import { extendTheme } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
import { ThemeComponentProps } from '@chakra-ui/theme/dist/types/theme.types';

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
    heading: `'Inter', sans-serif`,
    body: `'Inter', sans-serif`,
  },
  semanticTokens: {
    colors: {
      // Backgrounds
      'bg.canvas': {
        default: 'white',
        _dark: 'zinc.950',
      },
      'bg.surface': {
        default: 'white',
        _dark: 'zinc.900',
      },
      'bg.subtle': {
        default: 'zinc.150',
        _dark: 'zinc.900',
      },
      'bg.muted': {
        default: 'zinc.200',
        _dark: 'zinc.700',
      },
      
      // Text
      'text.primary': {
        default: 'zinc.900',
        _dark: 'white',
      },
      'text.secondary': { // Keeping legacy support if needed, but preferring muted
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
        _dark: 'zinc.800',
      },
      'border.subtle': {
        default: 'zinc.100',
        _dark: 'zinc.800', // Or even subtler if needed
      },
      'border.muted': {
        default: 'zinc.200',
        _dark: 'zinc.700',
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
        },
        item: {
          bg: 'bg.surface',
          color: 'text.primary',
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
    global: (props: ThemeComponentProps) => ({
      body: {
        bg: 'bg.canvas',
        color: 'text.primary',
      },
    }),
  },
});

export default theme;

