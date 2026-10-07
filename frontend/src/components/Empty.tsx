import React from 'react';
import { useColorModeValue, Heading, Text, VStack, Box } from '@chakra-ui/react';
import LottieAnimation from './common/LottieAnimation';

interface EmptyProps {
  image?: string;
  emptyText?: string;
  emptyDesc?: string;
}

const Empty: React.FC<EmptyProps> = ({
  image,
  emptyText = 'No Data',
  emptyDesc = 'Start by creating your first item to manage your work efficiently.',
}) => {
  const textColor = useColorModeValue('zinc.900', 'white');
  const descColor = useColorModeValue('zinc.500', 'zinc.400');
  const glowBg = useColorModeValue('rgba(127, 86, 217, 0.05)', 'rgba(139, 92, 246, 0.08)');

  return (
    <VStack
      spacing={3}
      align="center"
      justify="center"
      textAlign="center"
      p={8}
      py={12}
      w="full"
      role="status"
    >
      <Box
        position="relative"
        p={4}
        borderRadius="24px"
        bg={glowBg}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <LottieAnimation
          name="empty-state"
          width="160px"
          height="140px"
          speed={0.8}
        />
      </Box>
      <Heading
        as="h2"
        fontSize="lg"
        fontWeight="600"
        color={textColor}
        letterSpacing="-0.01em"
      >
        {emptyText}
      </Heading>
      {emptyDesc ? (
        <Text
          fontSize="sm"
          color={descColor}
          maxW="360px"
          lineHeight="tall"
        >
          {emptyDesc}
        </Text>
      ) : null}
    </VStack>
  );
};

export default Empty;
