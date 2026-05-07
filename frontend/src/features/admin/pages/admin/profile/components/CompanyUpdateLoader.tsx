import React from 'react';
import ContentLoader from 'react-content-loader';
import { Box } from '@chakra-ui/react';

const CompanyUpdateLoader = () => {
  return (
    <Box width="100%">
      <ContentLoader
        speed={2}
        width="100%"
        height={400}
        viewBox="0 0 800 400"
        backgroundColor="#f3f3f3"
        foregroundColor="#ecebeb"
      >
        {/* Header */}
        <rect x="20" y="20" rx="5" ry="5" width="200" height="20" />
        <rect x="20" y="50" rx="5" ry="5" width="300" height="15" />

        {/* Buttons */}
        <rect x="600" y="20" rx="5" ry="5" width="80" height="30" />
        <rect x="690" y="20" rx="5" ry="5" width="80" height="30" />

        {/* Form Fields */}
        <rect x="20" y="100" rx="5" ry="5" width="200" height="20" />
        <rect x="250" y="100" rx="5" ry="5" width="400" height="40" />

        <rect x="20" y="160" rx="5" ry="5" width="200" height="20" />
        <rect x="250" y="160" rx="5" ry="5" width="400" height="40" />

        <rect x="20" y="220" rx="5" ry="5" width="200" height="20" />
        <rect x="250" y="220" rx="5" ry="5" width="400" height="40" />

        <rect x="20" y="280" rx="5" ry="5" width="200" height="20" />
        <rect x="250" y="280" rx="5" ry="5" width="400" height="40" />
      </ContentLoader>
    </Box>
  );
};

export default CompanyUpdateLoader;



