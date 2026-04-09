import { useState, useEffect, useCallback, useRef } from 'react';
import { ImageAPI } from '@/actions/image';

interface ImageData {
  key: string;
  thumbnail?: string;
  format?: string;
}

interface PreloadedImage {
  [key: string]: {
    blobUrl: string;
    isLoading: boolean;
    error: boolean;
  };
}

export const useImagePreloader = (images: ImageData[], format: string = 'webp') => {
  const [preloadedImages, setPreloadedImages] = useState<PreloadedImage>({});
  const [isPreloading, setIsPreloading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  // Use refs to track state and prevent unnecessary effects
  const currentImagesRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());

  const preloadImages = useCallback(
    async (imageList: ImageData[]) => {
      if (!imageList || imageList.length === 0) {
        setPreloadedImages({});
        setLoadedCount(0);
        setIsPreloading(false);
        return;
      }

      // Create a stable key from image keys to prevent unnecessary re-runs
      const imageKeys = imageList
        .map((img) => img.key)
        .filter(Boolean)
        .sort()
        .join(',');

      // Don't reload if images haven't changed
      if (imageKeys === currentImagesRef.current) {
        return;
      }

      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      currentImagesRef.current = imageKeys;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsPreloading(true);

      // Create a map to track loading state for each image
      const loadingMap: PreloadedImage = {};
      imageList.forEach((img) => {
        if (img.key) {
          loadingMap[img.key] = { blobUrl: '', isLoading: true, error: false };
        }
      });

      setPreloadedImages(loadingMap);
      setLoadedCount(0);

      try {
        // Limit concurrent requests to prevent overwhelming the browser
        const BATCH_SIZE = 5;
        const results: Array<{ key: string; blobUrl: string; isLoading: boolean; error: boolean } | null> = [];

        for (let i = 0; i < imageList.length; i += BATCH_SIZE) {
          if (abortController.signal.aborted) break;

          const batch = imageList.slice(i, i + BATCH_SIZE);
          const batchPromises = batch.map(async (img) => {
            if (!img.key || abortController.signal.aborted) return null;

            const isThumbnailUrl = typeof img.thumbnail === 'string' && img.thumbnail.startsWith('http');
            if (isThumbnailUrl) {
              return {
                key: img.key,
                blobUrl: img.thumbnail as string,
                isLoading: false,
                error: false,
              };
            }

            try {
              const blob = await ImageAPI.fetchImage(img.key, {
                thumbnail: Boolean(img.thumbnail ?? true),
                format: img.format ?? format,
              });

              if (abortController.signal.aborted) {
                return null;
              }

              const blobUrl = URL.createObjectURL(blob);
              blobUrlsRef.current.add(blobUrl);

              return {
                key: img.key,
                blobUrl,
                isLoading: false,
                error: false,
              };
            } catch (error) {
              if (abortController.signal.aborted) {
                return null;
              }
              console.error(`Failed to preload image ${img.key}:`, error);
              return {
                key: img.key,
                blobUrl: '',
                isLoading: false,
                error: true,
              };
            }
          });

          const batchResults = await Promise.allSettled(batchPromises);
          batchResults.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
              results.push(result.value);
            }
          });

          // Update progress after each batch
          if (!abortController.signal.aborted) {
            const updatedImages: PreloadedImage = { ...loadingMap };
            let successCount = 0;

            results.forEach((result) => {
              if (result) {
                const { key, blobUrl, isLoading, error } = result;
                updatedImages[key] = { blobUrl, isLoading, error };
                if (!error) successCount++;
              }
            });

            setPreloadedImages(updatedImages);
            setLoadedCount(successCount);
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Error preloading images:', error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsPreloading(false);
        }
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [format]
  );

  // Preload images when the images array changes
  useEffect(() => {
    preloadImages(images);
  }, [images, preloadImages]);

  // Cleanup on unmount
  useEffect(() => {
    const urlsToCleanup = blobUrlsRef.current;
    const currentAbortController = abortControllerRef.current;

    return () => {
      // Cancel any ongoing requests
      if (currentAbortController) {
        currentAbortController.abort();
      }

      // Cleanup all tracked blob URLs
      urlsToCleanup.forEach((url: string) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore cleanup errors
        }
      });
      urlsToCleanup.clear();
    };
  }, []);

  const getImage = useCallback(
    (key: string) => {
      return preloadedImages[key] || { blobUrl: '', isLoading: true, error: false };
    },
    [preloadedImages]
  );

  return {
    preloadedImages,
    isPreloading,
    loadedCount,
    getImage,
    preloadImages,
  };
};

