import React from 'react';
import { SimpleGrid, Box, useColorModeValue, Tooltip } from '@chakra-ui/react';
import { OptionType } from '@/types';

interface ResolutionSelectorProps {
  selectedResolution: string;
  onResolutionSelect: (resolution: OptionType) => void;
  onClose?: () => void;
  className?: string;
  disabledValues?: string[];
  disabledTooltip?: string;
}

const ResolutionSelector: React.FC<ResolutionSelectorProps> = ({
  selectedResolution,
  onResolutionSelect,
  className = '',
  disabledValues = [],
  disabledTooltip,
}) => {
  // Available resolutions: 1K, 2K, 4K
  const resolutions = [
    { value: '1K', label: '1K' },
    { value: '2K', label: '2K' },
    { value: '4K', label: '4K' },
  ];

  const selectedBorderColor = useColorModeValue('zinc.900', 'white');
  const selectedBgColor = useColorModeValue('zinc.100', 'zinc.800');
  const selectedTextColor = useColorModeValue('zinc.900', 'white');
  const inactiveBorderColor = useColorModeValue('zinc.200', 'zinc.700');
  const inactiveBgColor = useColorModeValue('white', 'zinc.800');
  const inactiveTextColor = useColorModeValue('zinc.900', 'zinc.100');
  const hoverBgColor = useColorModeValue('zinc.50', 'zinc.800');
  const hoverBorderColor = useColorModeValue('zinc.400', 'zinc.500');

  return (
    <Box className={className}>
      <SimpleGrid columns={3} spacing={2}>
        {resolutions.map((item) => {
          const isSelected = selectedResolution === item.value;
          const isDisabled = disabledValues.includes(item.value);
          const button = (
            <Box
              key={item.value}
              as="button"
              onClick={() => {
                if (isDisabled) return;
                onResolutionSelect(item);
              }}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              py={3}
              px={2}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={isSelected ? selectedBorderColor : inactiveBorderColor}
              bg={isSelected ? selectedBgColor : inactiveBgColor}
              color={isSelected ? selectedTextColor : inactiveTextColor}
              textTransform="uppercase"
              fontSize="sm"
              fontWeight="semibold"
              transition="all 0.2s"
              cursor={isDisabled ? 'not-allowed' : 'pointer'}
              opacity={isDisabled ? 0.6 : 1}
              _hover={
                isDisabled
                  ? {}
                  : {
                      bg: hoverBgColor,
                      borderColor: hoverBorderColor,
                    }
              }
            >
              {item.label}
            </Box>
          );
          return (
            <Tooltip key={item.value} label={isDisabled ? disabledTooltip : ''} isDisabled={!isDisabled || !disabledTooltip}>
              {button}
            </Tooltip>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};

export default ResolutionSelector;

