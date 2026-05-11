import { useEffect, useMemo } from 'react';
import { Flex, GridItem, SimpleGrid } from '@chakra-ui/react';
import FilterGeneratedType from '@/components/FilterGeneratedType';
import CardTutorial from '@/components/CardTutorial';
import { useAppDispatch, useAppSelector } from '@/store';
import { getCMSLearningCenter } from '@/slices/cms';
import { mapArticlesToBlogs } from '@/utils';

const Tutorials: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data } = useAppSelector((glbState) => glbState.cms.learning_center.tutorials);

  useEffect(() => {
    if (!data?.length) dispatch(getCMSLearningCenter({ type: 'learningCenterTutorial' }));
  }, []);

  const dataTutorials = useMemo(() => mapArticlesToBlogs(data, 'tutorials'), [data]);

  return (
    <Flex direction={'column'} padding={6} gap={4} maxHeight={'calc(100vh - 80px)'} overflowY={'auto'}>
      <FilterGeneratedType />
      <SimpleGrid columns={{ base: 1, lg: 2, xl: 4 }} spacing={4}>
        {dataTutorials.map((tutorial, index) => (
          <GridItem key={tutorial.id} rowSpan={1} colSpan={1}>
            <CardTutorial tutorial={tutorial} />
          </GridItem>
        ))}
      </SimpleGrid>
    </Flex>
  );
};

export default Tutorials;



