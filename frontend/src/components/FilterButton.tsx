import React from 'react';
import { Button, ButtonProps, useColorModeValue } from '@chakra-ui/react';

interface FilterButtonProps extends ButtonProps {
  isActive?: boolean;
  label: string;
  /** Forwarded to the rendered element when `as` is a router link. */
  to?: string;
}

export const FilterButton: React.FC<FilterButtonProps> = ({ isActive = false, label, ...props }) => {
  const activeBg = useColorModeValue('zinc.900', 'white');
  const activeColor = useColorModeValue('white', 'zinc.950');
  const inactiveBg = useColorModeValue('rgba(0, 0, 0, 0.03)', 'rgba(255, 255, 255, 0.04)');
  const inactiveBorder = useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)');
  const inactiveColor = useColorModeValue('zinc.600', 'zinc.400');

  return (
    <Button
      variant="outline"
      size="sm"
      minW="100px"
      h="34px"
      borderRadius="12px"
      fontWeight={isActive ? '600' : '500'}
      fontSize="xs"
      borderWidth="1px"
      borderColor={isActive ? 'transparent' : inactiveBorder}
      color={isActive ? activeColor : inactiveColor}
      bg={isActive ? activeBg : inactiveBg}
      boxShadow={isActive ? '0 2px 10px rgba(0, 0, 0, 0.15)' : 'none'}
      _hover={{
        bg: isActive ? activeBg : useColorModeValue('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.08)'),
        borderColor: isActive ? 'transparent' : 'brand.400',
        transform: 'translateY(-1px)',
      }}
      _active={{
        transform: 'translateY(0)',
      }}
      transition="all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
      {...props}
    >
      {label}
    </Button>
  );
};
