import { Flex, Text, useColorModeValue, type FlexProps } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface StatusChipProps extends Omit<FlexProps, 'children'> {
  tone?: ChipTone;
  icon?: ReactNode;
  children: ReactNode;
}

/** A status is always icon + text; color only reinforces it. */
export function StatusChip({ tone = 'neutral', icon, children, ...rest }: StatusChipProps) {
  const palette = {
    neutral: useColorModeValue({ bg: 'zinc.100', fg: 'zinc.800', border: 'zinc.300' }, { bg: 'zinc.800', fg: 'zinc.100', border: 'zinc.600' }),
    info: useColorModeValue({ bg: 'blue.50', fg: 'blue.900', border: 'blue.200' }, { bg: 'blue.900', fg: 'blue.100', border: 'blue.700' }),
    success: useColorModeValue({ bg: 'green.50', fg: 'green.900', border: 'green.200' }, { bg: 'green.900', fg: 'green.100', border: 'green.700' }),
    warning: useColorModeValue({ bg: 'orange.50', fg: 'orange.900', border: 'orange.200' }, { bg: 'orange.900', fg: 'orange.100', border: 'orange.700' }),
    danger: useColorModeValue({ bg: 'red.50', fg: 'red.900', border: 'red.200' }, { bg: 'red.900', fg: 'red.100', border: 'red.700' }),
  }[tone];
  return (
    <Flex
      display="inline-flex"
      align="center"
      gap={1.5}
      px={2.5}
      py={1}
      borderRadius="full"
      borderWidth="1px"
      bg={palette.bg}
      color={palette.fg}
      borderColor={palette.border}
      fontSize="xs"
      fontWeight="medium"
      lineHeight="short"
      maxW="100%"
      {...rest}
    >
      {icon}
      <Text as="span" noOfLines={1} wordBreak="break-word">
        {children}
      </Text>
    </Flex>
  );
}
