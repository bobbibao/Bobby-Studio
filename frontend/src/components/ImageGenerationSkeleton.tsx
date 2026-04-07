import React from 'react';
import { Box, Skeleton, SkeletonText, useColorModeValue } from '@chakra-ui/react';

interface ImageGenerationSkeletonProps {
  count?: number;
  compact?: boolean;
}

export const ImageGenerationSkeleton: React.FC<ImageGenerationSkeletonProps> = ({ count = 1, compact = false }) => {
  const cardBg = useColorModeValue('zinc.50', 'zinc.800');
  const overlayBg = useColorModeValue('zinc.600', 'zinc.600');
  const progressTrackBg = useColorModeValue('zinc.300', 'zinc.700');

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <Box
          key={idx}
          position="relative"
          overflow="hidden"
          rounded="lg"
          bg={cardBg}
          className="animate-pulse"
          style={{ aspectRatio: '1/1' }}
        >
          {/* Image placeholder with shimmer effect */}
          <Skeleton width="100%" height="100%" />

          {/* Progress indicator overlay */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg={overlayBg}
          >
            <Box textAlign="center">
              <Box mb={2}>
                <svg
                  className="animate-spin"
                  width="48"
                  height="48"
                  style={{ color: 'white' }}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </Box>
              {!compact && (
                <Box color="whiteAlpha.900" fontSize="sm" fontWeight="medium">
                  Generating...
                </Box>
              )}
            </Box>
          </Box>

          {/* Bottom progress bar */}
          <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            height="1"
            bg={progressTrackBg}
          >
            <Box
              height="100%"
              bg="brand.600"
              className="animate-[shimmer_2s_ease-in-out_infinite]"
              style={{ width: '30%' }}
            />
          </Box>
        </Box>
      ))}
    </>
  );
};

export const TimelineSkeletonBatch: React.FC<{ jobId: string; prompt?: string; imageCount?: number }> = ({
  jobId: _jobId,
  prompt,
  imageCount = 2,
}) => {
  const timelineBg = useColorModeValue('zinc.150', 'zinc.900');
  const timelineBorderColor = useColorModeValue('zinc.200', 'zinc.700');
  const panelBg = useColorModeValue('white', 'zinc.700');
  const panelBorderColor = useColorModeValue('zinc.200', 'zinc.700');
  const promptLabelColor = useColorModeValue('zinc.500', 'zinc.400');
  const promptTextColor = useColorModeValue('zinc.700', 'zinc.300');

  return (
    <Box
      mb={4}
      borderBottomWidth="1px"
      borderColor={timelineBorderColor}
      bg={timelineBg}
      p={4}
      rounded="lg"
    >
      {/* Timestamp skeleton */}
      <SkeletonText noOfLines={1} spacing="4" skeletonHeight="3" mb={2} w="12rem" />

      <div className="flex gap-2">
        {/* Images Grid - Left Side */}
        <div className="flex-1">
          <div className={`grid ${imageCount === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5`}>
            <ImageGenerationSkeleton count={imageCount} compact={true} />
          </div>
        </div>

        {/* Control Panel - Right Side */}
        <Box
          w="240px"
          bg={panelBg}
          rounded="lg"
          p={3}
          borderWidth="1px"
          borderColor={panelBorderColor}
        >
          <SkeletonText noOfLines={1} spacing="4" skeletonHeight="4" mb={3} w="6rem" />
          {prompt && (
            <Box mb={3}>
              <Box fontSize="xs" color={promptLabelColor} mb={1}>
                Prompt:
              </Box>
              <Box fontSize="xs" color={promptTextColor} className="line-clamp-2">
                {prompt}
              </Box>
            </Box>
          )}
          <Skeleton height="32px" mb={2} />
          <Skeleton height="32px" mb={2} />
          <Skeleton height="32px" mb={2} />
          <Skeleton height="32px" />
        </Box>
      </div>
    </Box>
  );
};

export default ImageGenerationSkeleton;

