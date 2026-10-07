import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import { LogoBobbyFull } from '@/shared/logo';
import LottieAnimation from './common/LottieAnimation';

export default function LoadingPage(props: { minHeight?: string }) {
  const glowBg = useColorModeValue(
    'radial-gradient(circle, rgba(127, 86, 217, 0.15) 0%, transparent 70%)',
    'radial-gradient(circle, rgba(139, 92, 246, 0.22) 0%, transparent 70%)'
  );

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      w="full"
      position="relative"
      style={{ minHeight: props.minHeight || '100vh' }}
      role="status"
      aria-label="Loading"
    >
      <Box
        position="absolute"
        w="280px"
        h="280px"
        bg={glowBg}
        borderRadius="full"
        pointerEvents="none"
        filter="blur(30px)"
      />
      <Box position="relative" zIndex={1} display="flex" flexDirection="column" alignItems="center" gap={4}>
        <LogoBobbyFull />
        <Box w="64px" h="64px">
          <LottieAnimation name="ai-twinkle" width="64px" height="64px" />
        </Box>
      </Box>
    </Flex>
  );
}
