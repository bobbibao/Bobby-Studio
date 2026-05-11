import React, { useEffect, useMemo } from 'react';
import { Box, SimpleGrid } from '@chakra-ui/react';
import CardTutorial from './CardTutorial';
import { useAppDispatch, useAppSelector } from '@/store';
import { getCMSLearningCenter } from '@/slices/cms';
import { mapArticlesToBlogs } from '@/utils';
import SectionHeading from './SectionHeading';

const SectionTutorials: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data } = useAppSelector((glbState) => glbState.cms.learning_center.tutorials);

  useEffect(() => {
    if (!data?.length) dispatch(getCMSLearningCenter({ type: 'learningCenterTutorial' }));
  }, []);

  const dataTutorials = useMemo(() => mapArticlesToBlogs(data, 'tutorials'), [data]);

  return (
    <Box as="section" w="full">
      <SectionHeading
        title="Tutorials"
        description="Follow comprehensive tutorials to master AI tools and techniques in architecture."
        ctaHref="tutorials"
        ctaLabel="See all"
      />
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4} mt={6}>
        {dataTutorials.slice(0, 4).map((tutorial) => (
          <CardTutorial tutorial={tutorial} key={tutorial.id} />
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default SectionTutorials;



