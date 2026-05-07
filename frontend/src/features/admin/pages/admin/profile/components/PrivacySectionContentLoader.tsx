import ContentLoader from 'react-content-loader';
import React from 'react';

export default function PrivacySectionContentLoader() {
  return (
    <>
      <ContentLoader viewBox="0 0 600 200" height={200} width="100%">
        <rect x="0" y="10" rx="5" ry="5" width="280" height="20" />
        <rect x="0" y="40" rx="5" ry="5" width="500" height="20" />
        <rect x="0" y="80" rx="5" ry="5" width="280" height="20" />
        <rect x="0" y="110" rx="5" ry="5" width="500" height="20" />
        <rect x="0" y="150" rx="5" ry="5" width="280" height="20" />
        <rect x="0" y="180" rx="5" ry="5" width="500" height="20" />
      </ContentLoader>
    </>
  );
}



