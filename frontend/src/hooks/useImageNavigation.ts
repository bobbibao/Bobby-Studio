import { useCallback, useEffect, useState } from 'react';

interface UseImageNavigationOptions {
  /**
   * Total number of images available for navigation
   */
  totalImages: number;
  /**
   * Callback function to be called when image index changes
   * @param newIndex - The new image index
   * @param previousIndex - The previous image index
   */
  onIndexChange?: (newIndex: number, previousIndex: number) => void;
  /**
   * Initial index to start with (default: 0)
   */
  initialIndex?: number;
}

interface UseImageNavigationReturn {
  /**
   * Current image index
   */
  currentIndex: number;
  /**
   * Navigate to next image
   */
  handleNext: () => void;
  /**
   * Navigate to previous image
   */
  handlePrev: () => void;
  /**
   * Navigate to a specific image index
   */
  goToIndex: (index: number) => void;
}

/**
 * Custom hook for managing image navigation state with keyboard support
 *
 * Provides:
 * - Current image index tracking
 * - Next/Previous navigation with boundary checks
 * - Keyboard arrow key support (← and → keys)
 * - Callback on index changes
 *
 * @param options - Configuration object with totalImages and optional callbacks
 * @returns Object containing current index and navigation functions
 *
 * @example
 * ```tsx
 * const { currentIndex, handleNext, handlePrev } = useImageNavigation({
 *   totalImages: images.length,
 *   onIndexChange: (newIndex) => console.log(`Moved to image ${newIndex}`),
 *   initialIndex: 0,
 * });
 * ```
 */
export const useImageNavigation = ({
  totalImages,
  onIndexChange,
  initialIndex = 0,
}: UseImageNavigationOptions): UseImageNavigationReturn => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Sync currentIndex when initialIndex changes (e.g., when user clicks different image)
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < totalImages) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, totalImages]);

  /**
   * Navigate to next image
   * Does nothing if already at the last image
   */
  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex < totalImages - 1) {
        const newIndex = prevIndex + 1;
        onIndexChange?.(newIndex, prevIndex);
        return newIndex;
      }
      return prevIndex;
    });
  }, [onIndexChange, totalImages]);

  /**
   * Navigate to previous image
   * Does nothing if already at the first image
   */
  const handlePrev = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex > 0) {
        const newIndex = prevIndex - 1;
        onIndexChange?.(newIndex, prevIndex);
        return newIndex;
      }
      return prevIndex;
    });
  }, [onIndexChange, totalImages]);

  /**
   * Navigate to a specific image index
   * Validates that index is within valid range
   */
  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalImages) {
        setCurrentIndex((prevIndex) => {
          if (index !== prevIndex) {
            onIndexChange?.(index, prevIndex);
          }
          return index;
        });
      }
    },
    [onIndexChange, totalImages]
  );

  /**
   * Handle keyboard arrow keys for navigation
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrev();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNext, handlePrev]);

  return {
    currentIndex,
    handleNext,
    handlePrev,
    goToIndex,
  };
};

export default useImageNavigation;

