import React from 'react';
import { Box, Flex, Text, Badge, useColorModeValue } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface BillingCycleToggleProps {
  billingCycle: 'monthly' | 'yearly';
  onChange: (cycle: 'monthly' | 'yearly') => void;
}

export const BillingCycleToggle: React.FC<BillingCycleToggleProps> = ({
  billingCycle,
  onChange,
}) => {
  const { t } = useTranslation();

  // Color mode values
  const containerBg = useColorModeValue('zinc.100', 'zinc.800');
  const containerBorder = useColorModeValue('zinc.200', 'zinc.700');
  const activeBg = useColorModeValue('white', 'zinc.700');
  const activeText = useColorModeValue('zinc.900', 'white');
  const inactiveText = useColorModeValue('zinc.500', 'zinc.400');

  return (
    <Flex
      align="center"
      bg={containerBg}
      borderRadius="lg"
      p="4px"
      borderWidth="1px"
      borderColor={containerBorder}
      gap={0}
      w="fit-content"
    >
      {/* Monthly Button */}
      <Box
        px={4}
        py={2}
        borderRadius="md"
        cursor="pointer"
        transition="all 0.15s ease"
        bg={billingCycle === 'monthly' ? activeBg : 'transparent'}
        onClick={() => onChange('monthly')}
      >
        <Text
          fontSize="sm"
          fontWeight="medium"
          color={billingCycle === 'monthly' ? activeText : inactiveText}
          transition="color 0.15s ease"
        >
          {t('profile:monthly')}
        </Text>
      </Box>

      {/* Yearly Button */}
      <Flex
        align="center"
        gap={2}
        px={4}
        py={2}
        borderRadius="md"
        cursor="pointer"
        transition="all 0.15s ease"
        bg={billingCycle === 'yearly' ? activeBg : 'transparent'}
        onClick={() => onChange('yearly')}
      >
        <Text
          fontSize="sm"
          fontWeight="medium"
          color={billingCycle === 'yearly' ? activeText : inactiveText}
          transition="color 0.15s ease"
        >
          {t('profile:annually')}
        </Text>
        <Badge
          bg="green.500"
          color="white"
          borderRadius="md"
          fontSize="xs"
          fontWeight="semibold"
          px={1.5}
          py={0.5}
        >
          -20%
        </Badge>
      </Flex>
    </Flex>
  );
};



