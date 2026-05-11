import React, { useEffect, useMemo } from 'react';
import { Box, SimpleGrid } from '@chakra-ui/react';
import CardModel from './CardModel';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { getCMSLearningCenter } from '@/slices/cms';
import { mapArticlesToBlogs } from '@/utils';
import SectionHeading from './SectionHeading';

const SectionModels: React.FC = () => {
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  const { data } = useAppSelector((glbState) => glbState.cms.learning_center.models);

  const onClickModel = (type: string) => {};

  useEffect(() => {
    if (!data?.length) dispatch(getCMSLearningCenter({ type: 'learningCenterModel' }));
  }, []);

  const dataModels = useMemo(() => mapArticlesToBlogs(data, 'models'), [data]);

  return (
    <Box as="section" w="full">
      <SectionHeading
        title="Models"
        description="Discover AI-driven models designed to transform architectural insights and design processes."
      />
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4} mt={6}>
        {dataModels.slice(0, 4).map((model) => (
          <CardModel model={model} key={model.id} onClickModel={onClickModel} />
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default SectionModels;



