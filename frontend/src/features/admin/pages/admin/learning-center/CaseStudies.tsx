import { useEffect, useMemo } from 'react';
import { AspectRatio, Flex, GridItem, SimpleGrid } from '@chakra-ui/react';
import FilterGeneratedType from '@/components/FilterGeneratedType';
import CardCaseStudy from '@/components/CardCaseStudy';
import { useAppDispatch, useAppSelector } from '@/store';
import { getCMSLearningCenter } from '@/slices/cms';
import { mapArticlesToBlogs } from '@/utils';

const CaseStudies: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data } = useAppSelector((glbState) => glbState.cms.learning_center.caseStudies);

  useEffect(() => {
    if (!data?.length) dispatch(getCMSLearningCenter({ type: 'learningCenterCaseStudy' }));
  }, []);

  const dataCaseStudies = useMemo(() => mapArticlesToBlogs(data, 'case-studies'), [data]);
  return (
    <Flex direction={'column'} padding={6} gap={4} maxHeight={'calc(100vh - 80px)'} overflowY={'auto'}>
      <FilterGeneratedType />
      <SimpleGrid columns={{ base: 1, lg: 2, xl: 4 }} spacing={4}>
        {dataCaseStudies.slice(0, 2).map((caseStudy, index) => (
          <GridItem rowSpan={{ lg: 1, xl: 2 }} colSpan={{ lg: 1, xl: 2 }}>
            <AspectRatio ratio={548 / 274}>
              <CardCaseStudy caseStudy={caseStudy} key={caseStudy.id} hasReadMoreIcon={true} />
            </AspectRatio>
          </GridItem>
        ))}
        {dataCaseStudies.slice(2).map((caseStudy, index) => (
          <GridItem rowSpan={1} colSpan={1}>
            <CardCaseStudy caseStudy={caseStudy} key={caseStudy.id} hasReadMoreIcon={true} />
          </GridItem>
        ))}
      </SimpleGrid>
    </Flex>
  );
};

export default CaseStudies;



