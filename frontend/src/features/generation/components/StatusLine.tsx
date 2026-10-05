import { Box, Flex, Text, VisuallyHidden } from '@chakra-ui/react';
import { AlertCircle, CircleDollarSign, Clock, PauseCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export interface StatusLineProps {
  /** Short, stable message announced politely (no ticking numbers). */
  announcement: string;
  /** Visible, persistent notices (icon + text). */
  notices: Array<{ key: string; tone: 'info' | 'warning' | 'danger'; kind: 'problem' | 'credits' | 'paused' | 'throttle'; text: ReactNode }>;
}

const ICONS = {
  problem: <AlertCircle size={16} aria-hidden="true" />,
  credits: <CircleDollarSign size={16} aria-hidden="true" />,
  paused: <PauseCircle size={16} aria-hidden="true" />,
  throttle: <Clock size={16} aria-hidden="true" />,
} as const;

/** Polite live region for state changes plus the visible notices; the two never duplicate countdown noise. */
export function StatusLine({ announcement, notices }: StatusLineProps) {
  return (
    <Box>
      <VisuallyHidden role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </VisuallyHidden>
      {notices.map((notice) => (
        <Flex
          key={notice.key}
          align="flex-start"
          gap={2}
          mb={2}
          p={3}
          borderRadius="10px"
          borderWidth="1px"
          borderColor={notice.tone === 'danger' ? 'red.300' : notice.tone === 'warning' ? 'orange.300' : 'border.default'}
          bg="bg.subtle"
        >
          {ICONS[notice.kind]}
          <Text fontSize="sm" flex="1" minW={0}>
            {notice.text}
          </Text>
        </Flex>
      ))}
    </Box>
  );
}
