import { useEffect, useState } from 'react';

export type ViewportTier = 'mobile' | 'tablet' | 'desktop';

export const TABLET_MIN_WIDTH = 768;
export const DESKTOP_MIN_WIDTH = 1280;

function readTier(): ViewportTier {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'desktop';
  }
  if (window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches) {
    return 'desktop';
  }
  return window.matchMedia(`(min-width: ${TABLET_MIN_WIDTH}px)`).matches ? 'tablet' : 'mobile';
}

/** Mobile below 768 px, tablet below 1280 px, otherwise desktop. Rendering a single variant avoids duplicate canvases. */
export function useViewportTier(): ViewportTier {
  const [tier, setTier] = useState<ViewportTier>(readTier);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const queries = [window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`), window.matchMedia(`(min-width: ${TABLET_MIN_WIDTH}px)`)];
    const update = () => setTier(readTier());
    queries.forEach((query) => query.addEventListener('change', update));
    update();
    return () => queries.forEach((query) => query.removeEventListener('change', update));
  }, []);
  return tier;
}
