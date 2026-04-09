import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  root?: Element | null;
}

export const useIntersectionObserver = (options: UseIntersectionObserverOptions = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  const callback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      const isElementIntersecting = entry.isIntersecting;

      setIsIntersecting(isElementIntersecting);

      if (isElementIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    },
    [hasIntersected]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(callback, {
      threshold: options.threshold ?? 0.1,
      rootMargin: options.rootMargin ?? '50px',
      root: options.root ?? null,
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [callback, options.threshold, options.rootMargin, options.root]);

  return {
    elementRef,
    isIntersecting,
    hasIntersected,
  };
};

