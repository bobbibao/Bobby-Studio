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
    neutral: useColorModeValue(
      { bg: 'rgba(0,0,0,0.04)', fg: 'zinc.800', border: 'rgba(0,0,0,0.08)' },
      { bg: 'rgba(255,255,255,0.06)', fg: 'zinc.100', border: 'rgba(255,255,255,0.1)' }
    ),
    info: useColorModeValue(
      { bg: 'rgba(6, 182, 212, 0.08)', fg: 'cyan.700', border: 'rgba(6, 182, 212, 0.25)' },
      { bg: 'rgba(6, 182, 212, 0.15)', fg: 'cyan.200', border: 'rgba(6, 182, 212, 0.35)' }
    ),
    success: useColorModeValue(
      { bg: 'rgba(16, 185, 129, 0.08)', fg: 'emerald.700', border: 'rgba(16, 185, 129, 0.25)' },
      { bg: 'rgba(16, 185, 129, 0.15)', fg: 'emerald.200', border: 'rgba(16, 185, 129, 0.35)' }
    ),
    warning: useColorModeValue(
      { bg: 'rgba(245, 158, 11, 0.08)', fg: 'orange.700', border: 'rgba(245, 158, 11, 0.25)' },
      { bg: 'rgba(245, 158, 11, 0.15)', fg: 'orange.200', border: 'rgba(245, 158, 11, 0.35)' }
    ),
    danger: useColorModeValue(
      { bg: 'rgba(239, 68, 68, 0.08)', fg: 'red.700', border: 'rgba(239, 68, 68, 0.25)' },
      { bg: 'rgba(239, 68, 68, 0.15)', fg: 'red.200', border: 'rgba(239, 68, 68, 0.35)' }
    ),
  }[tone];

  return (
    <Flex
      display="inline-flex"
      align="center"
      gap={1.5}
      px={3}
      py={1}
      borderRadius="full"
      borderWidth="1px"
      bg={palette.bg}
      color={palette.fg}
      borderColor={palette.border}
      fontSize="xs"
      fontWeight="500"
      lineHeight="short"
      maxW="100%"
      backdropFilter="blur(8px)"
      {...rest}
    >
      {icon}
      <Text as="span" noOfLines={1} wordBreak="break-word">
        {children}
      </Text>
    </Flex>
  );
}
