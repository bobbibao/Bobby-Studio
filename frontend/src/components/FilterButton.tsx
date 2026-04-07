import React from 'react';
import { Button, ButtonProps, useColorModeValue } from '@chakra-ui/react';

interface FilterButtonProps extends ButtonProps {
  isActive?: boolean;
  label: string;
}

export const FilterButton: React.FC<FilterButtonProps> = ({ isActive = false, label, ...props }) => {
  const activeBorderColor = useColorModeValue('zinc.900', 'white');
  const inactiveBorderColor = useColorModeValue('zinc.200', 'zinc.700');
  const activeColor = useColorModeValue('zinc.900', 'white');
  const inactiveColor = useColorModeValue('zinc.600', 'zinc.400');

  return (
    <Button
      variant="outline"
      size="sm"
      minW="120px"
      fontWeight={isActive ? 'semibold' : 'normal'}
      borderColor={isActive ? activeBorderColor : inactiveBorderColor}
      borderWidth="1px"
      color={isActive ? activeColor : inactiveColor}
      bg="transparent"
      _hover={{
        bg: 'transparent',
        borderColor: isActive ? activeBorderColor : 'zinc.400',
      }}
      _active={{
        bg: 'bg.subtle',
      }}
      transition="all 0.2s"
      {...props}
    >
      {label}
    </Button>
  );
};

