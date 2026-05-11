import React, { useEffect, useMemo } from 'react';
import { Box, SimpleGrid } from '@chakra-ui/react';
import CardCaseStudy from './CardCaseStudy';
import { useAppDispatch, useAppSelector } from '@/store';
import { getCMSLearningCenter } from '@/slices/cms';
import { mapArticlesToBlogs } from '@/utils';
import SectionHeading from './SectionHeading';

const SectionCaseStudies: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data } = useAppSelector((glbState) => glbState.cms.learning_center.caseStudies);

  useEffect(() => {
    if (!data?.length) dispatch(getCMSLearningCenter({ type: 'learningCenterCaseStudy' }));
  }, []);

  const dataCaseStudies = useMemo(() => mapArticlesToBlogs(data, 'case-studies'), [data]);

  return (
    <Box as="section" w="full">
      <SectionHeading
        title="Case Studies"
        description="Explore real-world applications of AI in architecture through detailed case studies."
        ctaHref="case-studies"
        ctaLabel="See all"
      />
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4} mt={6}>
        {dataCaseStudies.slice(0, 4).map((caseStudy) => (
          <CardCaseStudy caseStudy={caseStudy} key={caseStudy.id} hasReadMoreIcon />
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default SectionCaseStudies;



