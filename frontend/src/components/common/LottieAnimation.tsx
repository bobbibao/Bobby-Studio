import React, { useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Box, BoxProps, Spinner } from '@chakra-ui/react';

// Static assets bundled locally
import aiLoadingUrl from '@/assets/lottie/ai-loading.lottie';
import aiTwinkleUrl from '@/assets/lottie/ai-twinkle-loading.lottie';
import emptyBoxUrl from '@/assets/lottie/empty-box.lottie';
import emptyStateUrl from '@/assets/lottie/empty-state.lottie';
import successCheckUrl from '@/assets/lottie/success-check.lottie';
import errorUrl from '@/assets/lottie/error.lottie';
import error404Url from '@/assets/lottie/error-404.lottie';

export type LottieName =
  | 'ai-loading'
  | 'ai-twinkle'
  | 'empty-box'
  | 'empty-state'
  | 'success-check'
  | 'error'
  | 'error-404';

const LOTTIE_MAP: Record<LottieName, string> = {
  'ai-loading': aiLoadingUrl,
  'ai-twinkle': aiTwinkleUrl,
  'empty-box': emptyBoxUrl,
  'empty-state': emptyStateUrl,
  'success-check': successCheckUrl,
  error: errorUrl,
  'error-404': error404Url,
};

export interface LottieAnimationProps extends BoxProps {
  name: LottieName;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  width?: string | number;
  height?: string | number;
}

if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'undefined') {
  // @ts-expect-error polyfill for jsdom
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  name,
  loop = true,
  autoplay = true,
  speed = 1,
  width = '100%',
  height = '100%',
  ...boxProps
}) => {
  const [hasError, setHasError] = useState(false);
  const src = LOTTIE_MAP[name];

  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return (
      <Box
        data-testid={`lottie-${name}`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        w={width}
        h={height}
        {...boxProps}
      />
    );
  }

  if (!src || hasError) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        w={width}
        h={height}
        {...boxProps}
      >
        <Spinner size="md" color="brand.500" thickness="3px" />
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      w={width}
      h={height}
      overflow="hidden"
      {...boxProps}
    >
      <DotLottieReact
        src={src}
        loop={loop}
        autoplay={autoplay}
        speed={speed}
        style={{ width: '100%', height: '100%' }}
        onError={() => setHasError(true)}
      />
    </Box>
  );
};

export default LottieAnimation;
