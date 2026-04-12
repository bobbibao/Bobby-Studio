import { defineStyleConfig } from '@chakra-ui/react';

const Tooltip = defineStyleConfig({
  baseStyle: {
    bg: 'rgba(17, 17, 19, 0.9)', // Almost black with 10% transparency
    color: 'white',
    borderRadius: 'md',
    px: 3,
    py: 2,
    backdropFilter: 'blur(8px)',
    boxShadow: 'lg',
  },
});

export default Tooltip;


