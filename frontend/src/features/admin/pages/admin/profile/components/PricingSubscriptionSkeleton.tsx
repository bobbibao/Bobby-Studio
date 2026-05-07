import ContentLoader from 'react-content-loader';
import { SimpleGrid, Box } from '@chakra-ui/react';

const SubscriptionSkeleton = () => (
  <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
    {[1, 2, 3].map((key) => (
      <Box
        key={key}
        display="flex"
        flexDirection="column"
        rounded="md"
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        p="6"
        gap="4"
      >
        <ContentLoader
          speed={2}
          width="100%"
          height={160}
          viewBox="0 0 400 160"
          backgroundColor="#f3f3f3"
          foregroundColor="#ecebeb"
        >
          <rect x="0" y="0" rx="5" ry="5" width="120" height="20" />
          <rect x="0" y="40" rx="5" ry="5" width="200" height="30" />
          <rect x="0" y="90" rx="5" ry="5" width="250" height="15" />
          <rect x="0" y="120" rx="5" ry="5" width="100" height="30" />
        </ContentLoader>
      </Box>
    ))}
  </SimpleGrid>
);

export default SubscriptionSkeleton;



