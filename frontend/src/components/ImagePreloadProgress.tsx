import React from 'react';
import { Box, Progress, Text, VStack } from '@chakra-ui/react';

interface ImagePreloadProgressProps {
  totalImages: number;
  loadedImages: number;
  isVisible: boolean;
}

export const ImagePreloadProgress: React.FC<ImagePreloadProgressProps> = ({ totalImages, loadedImages, isVisible }) => {
  if (!isVisible || totalImages === 0) return null;

  const progressPercentage = (loadedImages / totalImages) * 100;
  const remainingImages = totalImages - loadedImages;

  return (
    <Box
      position="fixed"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
      zIndex={1000}
      bg="white"
      _dark={{ bg: 'gray.800', borderColor: 'gray.600' }}
      p={6}
      borderRadius="lg"
      boxShadow="xl"
      border="1px solid"
      borderColor="gray.200"
      minW="300px"
    >
      <VStack spacing={4}>
        <Text fontSize="lg" fontWeight="semibold">
          Loading Images...
        </Text>
        <Progress value={progressPercentage} size="lg" colorScheme="blue" borderRadius="full" w="full" />
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
          {loadedImages} of {totalImages} images loaded
          {remainingImages > 0 && ` (${remainingImages} remaining)`}
        </Text>
      </VStack>
    </Box>
  );
};

