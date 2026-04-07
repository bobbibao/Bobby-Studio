import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageNavigationArrowsProps {
  /**
   * Current index in the image array
   */
  currentIndex: number;
  /**
   * Total number of images
   */
  totalImages: number;
  /**
   * Callback when left arrow is clicked (navigate to previous image)
   */
  onPrevious: () => void;
  /**
   * Callback when right arrow is clicked (navigate to next image)
   */
  onNext: () => void;
}

/**
 * ImageNavigationArrows Component
 *
 * Reusable left/right arrow navigation buttons for image grid navigation in modals.
 * Displays navigation arrows overlaid on the image display area.
 * - Left arrow: Navigate to previous image (disabled if at first image)
 * - Right arrow: Navigate to next image (disabled if at last image)
 *
 * @param currentIndex - Current position in the image array
 * @param totalImages - Total number of images available
 * @param onPrevious - Callback function when left arrow is clicked
 * @param onNext - Callback function when right arrow is clicked
 *
 * @example
 * ```tsx
 * <ImageNavigationArrows
 *   currentIndex={0}
 *   totalImages={10}
 *   onPrevious={() => setIndex(i => i - 1)}
 *   onNext={() => setIndex(i => i + 1)}
 * />
 * ```
 */
export const ImageNavigationArrows: React.FC<ImageNavigationArrowsProps> = ({ currentIndex, totalImages, onPrevious, onNext }) => {
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < totalImages - 1;

  return (
    <>
      {/* Left Arrow Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (canGoPrevious) {
            onPrevious();
          }
        }}
        disabled={!canGoPrevious}
        className={`absolute left-4 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full transition-all duration-200 ${
          canGoPrevious ? 'bg-black/40 hover:bg-black/60 text-white cursor-pointer' : 'bg-black/20 text-gray-400 cursor-not-allowed'
        }`}
        aria-label="Previous image"
        title={canGoPrevious ? 'Previous image (← arrow key)' : 'No previous image'}
      >
        <ChevronLeft size={28} strokeWidth={2} />
      </button>

      {/* Right Arrow Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (canGoNext) {
            onNext();
          }
        }}
        disabled={!canGoNext}
        className={`absolute right-4 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full transition-all duration-200 ${
          canGoNext ? 'bg-black/40 hover:bg-black/60 text-white cursor-pointer' : 'bg-black/20 text-gray-400 cursor-not-allowed'
        }`}
        aria-label="Next image"
        title={canGoNext ? 'Next image (→ arrow key)' : 'No next image'}
      >
        <ChevronRight size={28} strokeWidth={2} />
      </button>
    </>
  );
};

export default ImageNavigationArrows;

