import React from 'react';
import { ChevronUp, X } from 'lucide-react';
import UnionLight from '@/shared/icons/UnionLight';
import { OptionType } from '@/types';
import { Box, useColorModeValue } from '@chakra-ui/react';

interface RatioSelectorProps {
  selectedRatio: string;
  leftValue: string | number;
  onRatioSelect: (ratio: OptionType) => void;
  onClose: () => void;
  className?: string;
  plainContainer?: boolean;
}

const RatioSelector: React.FC<RatioSelectorProps> = ({
  selectedRatio,
  leftValue,
  onRatioSelect,
  onClose,
  className = '',
  plainContainer = false,
}) => {
  // Aspect ratio options
  const aspectRatios = [
    { value: '21:9', label: '21:9', orientation: 'landscape' },
    { value: '16:9', label: '16:9', orientation: 'landscape' },
    { value: '3:2', label: '3:2', orientation: 'landscape' },
    { value: '4:3', label: '4:3', orientation: 'portrait' },
    { value: '1:1', label: '1:1', orientation: 'square' },
    { value: '3:4', label: '3:4', orientation: 'portrait' },
    { value: '2:3', label: '2:3', orientation: 'portrait' },
    { value: '9:16', label: '9:16', orientation: 'portrait' },
    { value: '9:21', label: '9:21', orientation: 'portrait' },
  ];

  // Chakra color values
  const selectedBorderColor = useColorModeValue('zinc.900', 'white');
  const selectedBgColor = useColorModeValue('zinc.100', 'zinc.800');
  const inactiveBorderColor = useColorModeValue('zinc.200', 'zinc.700');
  const inactiveBgColor = useColorModeValue('white', 'zinc.800');
  const hoverBgColor = useColorModeValue('zinc.50', 'zinc.800');
  const hoverBorderColor = useColorModeValue('zinc.400', 'zinc.500');
  const textColor = useColorModeValue('zinc.900', 'zinc.100');
  const iconSelectedBorderColor = useColorModeValue('zinc.900', 'white');
  const iconInactiveBorderColor = useColorModeValue('zinc.400', 'zinc.600');
  const iconSelectedBgColor = useColorModeValue('zinc.100', 'zinc.800');

  const getRectangleIcon = (ratio: string, orientation: string, isSelected: boolean) => {
    const [width, height] = ratio.split(':').map(Number);
    const isWide = width > height;
    const isSquare = width === height;
    const iconBorderColor = isSelected ? iconSelectedBorderColor : iconInactiveBorderColor;
    const iconBgColor = isSelected ? iconSelectedBgColor : 'transparent';

    if (isSquare) {
      return <Box w="24px" h="24px" borderWidth="2px" borderRadius="sm" borderColor={iconBorderColor} bg={iconBgColor} />;
    } else if (isWide) {
      return <Box w="28px" h="16px" borderWidth="2px" borderRadius="sm" borderColor={iconBorderColor} bg={iconBgColor} />;
    } else {
      return <Box w="16px" h="28px" borderWidth="2px" borderRadius="sm" borderColor={iconBorderColor} bg={iconBgColor} />;
    }
  };

  const containerBg = useColorModeValue('zinc.50', 'zinc.950');
  const Container = plainContainer ? Box : Box;

  return (
    <Container p={plainContainer ? 0 : 4} bg={plainContainer ? 'transparent' : containerBg} className={className}>
      {/* Aspect Ratio Grid */}
      <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2}>
        {aspectRatios.map((item) => {
          const isSelected = selectedRatio === item.value;
          return (
            <Box
            key={item.value}
              as="button"
            onClick={() => onRatioSelect(item)}
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
              transition="all 0.2s"
              _hover={{
                bg: hoverBgColor,
                borderColor: hoverBorderColor,
              }}
          >
              <Box mb={2}>{getRectangleIcon(item.value, item.orientation, isSelected)}</Box>
              <Box as="span" fontSize="xs" fontWeight="medium" color={textColor}>
                {item.value}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Container>
  );
};

export default RatioSelector;

