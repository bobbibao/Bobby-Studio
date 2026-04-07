import React from 'react';
import { Box, Tab, TabList, Tabs, useColorModeValue } from '@chakra-ui/react';
import GridIcon from '@/shared/icons/GridIcon';
import ListIcon from '@/shared/icons/ListIcon';

interface ViewSwitcherProps {
  view: 'grid' | 'list';
  onChange: (value: 'grid' | 'list') => void;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ view, onChange }) => {
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
      <Tabs variant="unstyled" index={view === 'grid' ? 0 : 1}>
        <TabList display="flex" gap={1.5}>
          <Tab
            onClick={() => onChange('grid')}
            bg={view === 'grid' ? selectedBg : unselectedBg}
            color={view === 'grid' ? 'text.primary' : 'text.muted'}
            shadow={view === 'grid' ? 'sm' : 'none'}
            rounded="md"
            py={1}
            px={3}
            fontSize="sm"
            fontWeight="normal"
            _hover={{ bg: view === 'grid' ? selectedBg : hoverBg }}
            transition="all 0.2s"
          >
            <GridIcon />
          </Tab>
          <Tab
            onClick={() => onChange('list')}
            bg={view === 'list' ? selectedBg : unselectedBg}
            color={view === 'list' ? 'text.primary' : 'text.muted'}
            shadow={view === 'list' ? 'sm' : 'none'}
            rounded="md"
            py={1}
            px={3}
            fontSize="sm"
            fontWeight="normal"
            _hover={{ bg: view === 'list' ? selectedBg : hoverBg }}
            transition="all 0.2s"
          >
            <ListIcon />
          </Tab>
        </TabList>
      </Tabs>
    </Box>
  );
};


