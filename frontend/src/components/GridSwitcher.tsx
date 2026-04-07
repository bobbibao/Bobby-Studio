import React from 'react';
import { Box, Flex, Tab, TabList, Tabs, useColorModeValue } from '@chakra-ui/react';
import ThreeColumnsIcon from '@/shared/icons/ThreeColumnsIcon';
import FourColumnsIcon from '@/shared/icons/FourColumnsIcon';

interface GridSwitcherProps {
  columns: number;
  onChange: (value: number) => void;
}

export const GridSwitcher: React.FC<GridSwitcherProps> = ({ columns, onChange }) => {
  // These styles mirror the FilterButton's logic for consistency
  // We use the semantic tokens defined in the theme
  const borderColor = useColorModeValue('zinc.200', 'zinc.800');
  const containerBg = useColorModeValue('zinc.150', 'zinc.900');
  const selectedBg = useColorModeValue('white', 'zinc.700');
  const unselectedBg = useColorModeValue('transparent', 'transparent');
  const hoverBg = useColorModeValue('zinc.150', 'zinc.800');
  
  return (
    <Box 
      bg={containerBg}
      borderColor={borderColor}
      borderWidth="1px" 
      h="8"
      display="flex" 
      alignItems="center" 
      p={0.5} 
      rounded="lg"
    >
      <Tabs variant="unstyled" index={columns === 3 ? 0 : 1}>
        <TabList display="flex" gap={1.5}>
          <Tab
            onClick={() => onChange(3)}
            bg={columns === 3 ? selectedBg : unselectedBg}
            color={columns === 3 ? 'text.primary' : 'text.muted'}
            shadow={columns === 3 ? 'sm' : 'none'}
            rounded="md"
            py={1}
            px={3}
            fontSize="sm"
            fontWeight="normal"
            _hover={{ bg: columns === 3 ? selectedBg : hoverBg }}
            transition="all 0.2s"
          >
            <ThreeColumnsIcon />
          </Tab>
          <Tab
            onClick={() => onChange(4)}
            bg={columns === 4 ? selectedBg : unselectedBg}
            color={columns === 4 ? 'text.primary' : 'text.muted'}
            shadow={columns === 4 ? 'sm' : 'none'}
            rounded="md"
            py={1}
            px={3}
            fontSize="sm"
            fontWeight="normal"
            _hover={{ bg: columns === 4 ? selectedBg : hoverBg }}
            transition="all 0.2s"
          >
            <FourColumnsIcon />
          </Tab>
        </TabList>
      </Tabs>
    </Box>
  );
};


