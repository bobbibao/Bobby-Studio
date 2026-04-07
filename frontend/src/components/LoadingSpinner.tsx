import React from 'react';
import { Spinner, Flex } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const LoadingSpinner: React.FC = () => {
  const loading = useSelector((state: RootState) => state.loading.isLoading);

  if (!loading) {
    return null;
  }

  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      height="100vh"
      width="100vw"
      bgColor="rgba(255, 255, 255, 0.5)"
      position="fixed"
      top={0}
      left={0}
      zIndex={9999}
    >
      <Spinner
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color="primary.500"
        size="xl"
      />
    </Flex>
  );
};

export default LoadingSpinner;

