import React, { useState, useRef, useEffect } from 'react';
import { Image } from '@chakra-ui/react';
import { ImagePlaceholder } from './ImagePlaceholder';
import { ImageAPI } from '@/actions/image';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface ImageWithPlaceholderProps {
  imageKey?: string;
  imageUrl?: string; // Direct image URL
  thumbnailUrl?: string; // Thumbnail image URL
  thumbnail?: boolean;
  format?: string;
  dimensions?: string;
  className?: string;
  style?: React.CSSProperties;
  borderRadius?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  onClick?: (e: React.MouseEvent) => void;
  _hover?: any;
  preloadedBlobUrl?: string; // New prop for preloaded images
  alt?: string; // Alt text for the image
  [key: string]: any;
}

export const ImageWithPlaceholder: React.FC<ImageWithPlaceholderProps> = ({
  imageKey,
  imageUrl, // Direct image URL
  thumbnailUrl, // Thumbnail URL
  thumbnail = false,
  format = 'webp',
  dimensions,
  className = '',
  style,
  borderRadius = 'lg',
  objectFit = 'contain',
  loading = 'lazy',
  onClick,
  _hover,
  preloadedBlobUrl, // New prop
  alt = 'Image', // Default alt text
  ...otherProps
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [createdObjectUrl, setCreatedObjectUrl] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use intersection observer to only load images when they're visible
  const { elementRef, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px', // Start loading 100px before the image becomes visible
  }) as { elementRef: React.RefObject<HTMLDivElement>; hasIntersected: boolean };

  const shouldLoadImage = loading === 'eager' ? true : hasIntersected;

  useEffect(() => {
    if (!imageKey && !imageUrl && !thumbnailUrl && !preloadedBlobUrl) {
      setImageState('error');
      return;
    }

    if (preloadedBlobUrl) {
      if (!thumbnail && imageUrl) {
        setImageState('loading');
        setBlobUrl(imageUrl);
        return;
      }

      // Use preloaded blob (likely a thumbnail) for thumbnail renders.
      setBlobUrl(preloadedBlobUrl);
      // Treat preloaded image as already available so placeholder won't persist.
      setImageState('loaded');
      return;
    }

    // Decide which remote URL to use (thumbnail preferred for thumbnail mode)
    const remoteUrl = thumbnail ? thumbnailUrl || imageUrl : imageUrl || thumbnailUrl;

    // If we have a direct remote URL, set it for eager loading or when visible
    if (remoteUrl) {
      // Check if we should load the image
      if (!shouldLoadImage) {
        // Wait until visible (or eager)
        return;
      }

      setImageState('loading');
      setBlobUrl(remoteUrl);
      console.log(`🖼️ Frontend loading image from URL: ${remoteUrl}`);
      return;
    }

    // Fallback to original API call behavior when imageKey is provided
    if (imageKey) {
      if (!shouldLoadImage) return;

      setImageState('loading');
      setBlobUrl(null);

      let isCancelled = false;

      ImageAPI.fetchImage(imageKey, { thumbnail, format })
        .then((blob) => {
          if (!isCancelled) {
            const url = URL.createObjectURL(blob);
            setCreatedObjectUrl(true);
            setBlobUrl(url);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setImageState('error');
          }
        });

      return () => {
        isCancelled = true;
      };
    }

    // If no imageKey and no direct URLs, set error state
    setImageState('error');
  }, [imageKey, thumbnail, format, preloadedBlobUrl, shouldLoadImage, imageUrl, thumbnailUrl]);

  // Separate cleanup effect for blob URLs
  useEffect(() => {
    return () => {
      // Only revoke object URLs we created with createObjectURL
      if (blobUrl && !preloadedBlobUrl && createdObjectUrl) {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [blobUrl, preloadedBlobUrl, createdObjectUrl]);

  const handleImageLoad = () => {
    setImageState('loaded');
  };

  const handleImageError = () => {
    console.error(`❌ Failed to load image: ${blobUrl}`);
    setImageState('error');
  };

  const showPlaceholder = imageState !== 'loaded';

  // Calculate aspect ratio from dimensions
  const getAspectRatio = () => {
    if (dimensions) {
      const [width, height] = dimensions.split('x').map(Number);
      if (!isNaN(width) && !isNaN(height)) {
        return width / height;
      }
    }
    // Default aspect ratio for placeholders (16:9)
    return 16 / 9;
  };

  const aspectRatio = getAspectRatio();

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={`relative ${className}`}
      style={{
        overflow: 'hidden',
        width: '100%',
        aspectRatio: aspectRatio,
        borderRadius,
        ...style,
      }}
      onClick={onClick}
    >
      {showPlaceholder && (
        <div className="absolute inset-0">
          <ImagePlaceholder
            dimensions={dimensions || '1980x960'}
            borderRadius={borderRadius === 'lg' ? 'rounded-lg' : borderRadius}
            className="w-full h-full"
          />
        </div>
      )}

      {blobUrl && (
        <Image
          ref={imgRef}
          src={blobUrl}
          alt={alt}
          className={`w-full h-full transition-opacity duration-300 ${imageState === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          style={{
            objectFit: thumbnail ? 'cover' : objectFit,
            borderRadius,
          }}
          loading={loading}
          borderRadius={borderRadius}
          _hover={_hover}
          onLoad={handleImageLoad}
          onError={handleImageError}
          {...otherProps}
        />
      )}
    </div>
  );
};

