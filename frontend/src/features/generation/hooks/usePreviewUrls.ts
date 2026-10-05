import { useEffect, useRef } from 'react';

const MAX_LIVE_URLS = 24;

export interface PreviewUrlRegistry {
  create(blob: Blob): string;
  revokeAll(): void;
}

/** Keeps object URLs for compare views bounded and always released on unmount. */
export function createPreviewUrlRegistry(): PreviewUrlRegistry {
  const urls: string[] = [];
  return {
    create(blob) {
      const url = URL.createObjectURL(blob);
      urls.push(url);
      while (urls.length > MAX_LIVE_URLS) {
        const old = urls.shift();
        if (old) {
          URL.revokeObjectURL(old);
        }
      }
      return url;
    },
    revokeAll() {
      for (const url of urls.splice(0)) {
        URL.revokeObjectURL(url);
      }
    },
  };
}

export function usePreviewUrls(): PreviewUrlRegistry {
  const ref = useRef<PreviewUrlRegistry | null>(null);
  if (ref.current === null) {
    ref.current = createPreviewUrlRegistry();
  }
  const registry = ref.current;
  useEffect(() => () => registry.revokeAll(), [registry]);
  return registry;
}
