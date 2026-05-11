import React from 'react';
import { Flex } from '@chakra-ui/react';
import ModelsSection from '@/components/ModelsSection';
import VideosSection from '@/components/VideosSection';
import TutorialsSection from '@/components/TutorialsSection';
import CaseStudiesSection from '@/components/CaseStudiesSection';

const LearningCenterNew: React.FC = () => {
  return (
    <Flex
      paddingBlock={4}
      direction={'column'}
      maxHeight={'calc(100vh - 80px)'}
      overflowY={'auto'}
      gap={8}
      paddingInline={6}
    >
      <ModelsSection />
      <VideosSection />
      <TutorialsSection />
      <CaseStudiesSection />
    </Flex>
  );
};

export default LearningCenterNew;



