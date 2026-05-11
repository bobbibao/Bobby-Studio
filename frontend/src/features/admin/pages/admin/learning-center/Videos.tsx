import { useEffect, useMemo } from 'react';
import { AspectRatio, Flex, GridItem, SimpleGrid } from '@chakra-ui/react';
import FilterGeneratedType from '@/components/FilterGeneratedType';
import CardVideo from '@/components/CardVideo';
import CardVideoTextOutside from '@/components/CardVideoTextOutside';
import { mapArticlesToBlogs } from '@/utils';
import { getCMSLearningCenter } from '@/slices/cms';
import { useAppDispatch, useAppSelector } from '@/store';

const Videos: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data } = useAppSelector((glbState) => glbState.cms.learning_center.videos);

  useEffect(() => {
    if (!data?.length) dispatch(getCMSLearningCenter({ type: 'learningCenterVideo' }));
  }, []);

  const dataVideos = useMemo(() => mapArticlesToBlogs(data, 'videos'), [data]);

  return (
    <Flex direction={'column'} padding={6} gap={4} maxHeight={'calc(100vh - 80px)'} overflowY={'auto'}>
      <FilterGeneratedType />
      <SimpleGrid columns={{ base: 1, lg: 2, xl: 4 }} spacing={4}>
        {dataVideos.slice(0, 2).map((video, index) => (
          <GridItem rowSpan={{ lg: 1, xl: 2 }} colSpan={{ lg: 1, xl: 2 }}>
            <AspectRatio ratio={548 / 274}>
              <CardVideo video={video} key={video.id} />
            </AspectRatio>
          </GridItem>
        ))}
        {dataVideos.slice(2).map((video, index) => (
            <GridItem rowSpan={1} colSpan={1}>
              <CardVideoTextOutside video={video} key={video.id} />
            </GridItem>
          ))}
      </SimpleGrid>
    </Flex>
  );
};

export default Videos;



