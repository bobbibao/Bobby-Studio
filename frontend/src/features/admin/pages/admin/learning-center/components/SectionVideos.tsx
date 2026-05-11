import React, { useEffect, useMemo } from 'react';
import { Box, Flex, Grid, GridItem } from '@chakra-ui/react';
import CardVideo from './CardVideo';
import { useAppDispatch, useAppSelector } from '@/store';
import { getCMSLearningCenter } from '@/slices/cms';
import { mapArticlesToBlogs } from '@/utils';
import SectionHeading from './SectionHeading';

const SectionVideos: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data } = useAppSelector((glbState) => glbState.cms.learning_center.videos);

  useEffect(() => {
    if (!data?.length) dispatch(getCMSLearningCenter({ type: 'learningCenterVideo' }));
  }, []);

  const dataVideos = useMemo(() => mapArticlesToBlogs(data, 'videos'), [data]);

  const featuredVideo = dataVideos[0];
  const secondaryVideos = dataVideos.slice(1, 3);

  return (
    <Box as="section" w="full">
      <SectionHeading
        title="Videos"
        description="Learn with step-by-step video guides on AI applications in architecture."
        ctaHref="videos"
        ctaLabel="See all"
      />
      <Grid templateColumns={{ base: '1fr', xl: 'repeat(2, 1fr)' }} gap={4} mt={6}>
        {featuredVideo ? (
          <GridItem colSpan={1}>
            <CardVideo video={featuredVideo} variant="featured" />
          </GridItem>
        ) : null}
        {secondaryVideos.length ? (
          <GridItem colSpan={1}>
            <Flex direction="column" gap={4}>
              {secondaryVideos.map((video) => (
                <CardVideo video={video} key={video.id} />
              ))}
            </Flex>
          </GridItem>
        ) : null}
      </Grid>
    </Box>
  );
};

export default SectionVideos;



