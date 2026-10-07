import React from 'react';
import { Box, Tab, TabList, Tabs, useColorModeValue } from '@chakra-ui/react';
import ThreeColumnsIcon from '@/shared/icons/ThreeColumnsIcon';
import FourColumnsIcon from '@/shared/icons/FourColumnsIcon';

interface GridSwitcherProps {
  columns: number;
  onChange: (value: number) => void;
}

export const GridSwitcher: React.FC<GridSwitcherProps> = ({ columns, onChange }) => {
  const borderColor = useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)');
  const containerBg = useColorModeValue('rgba(0, 0, 0, 0.03)', 'rgba(255, 255, 255, 0.04)');
  const selectedBg = useColorModeValue('white', 'zinc.800');
  const unselectedBg = 'transparent';
  const hoverBg = useColorModeValue('rgba(0, 0, 0, 0.05)', 'rgba(255, 255, 255, 0.06)');
  
  return (
    <Box 
      bg={containerBg}
      borderColor={borderColor}
      borderWidth="1px" 
      h="34px"
      display="flex" 
      alignItems="center" 
      p="3px" 
      rounded="12px"
    >
      <Tabs variant="unstyled" index={columns === 3 ? 0 : 1}>
        <TabList display="flex" gap={1}>
          <Tab
            onClick={() => onChange(3)}
            bg={columns === 3 ? selectedBg : unselectedBg}
            color={columns === 3 ? 'text.primary' : 'text.muted'}
            shadow={columns === 3 ? 'sm' : 'none'}
            rounded="8px"
            py={1}
            px={2.5}
            h="26px"
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
            rounded="8px"
            py={1}
            px={2.5}
            h="26px"
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
