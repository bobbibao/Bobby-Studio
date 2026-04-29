import { Skeleton, SimpleGrid } from '@chakra-ui/react';

export const LoadingCards = () => {
  return (
    <SimpleGrid 
      columns={{ base: 1, md: 2, lg: 3 }} 
      spacing={4} 
      p={4}
    >
      {[...Array(6)].map((_, index) => (
        <Skeleton 
          key={index}
          height="200px"
          borderRadius="md"
        />
      ))}
    </SimpleGrid>
  );
};



