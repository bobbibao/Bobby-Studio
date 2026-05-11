import { useEffect, useMemo } from 'react';
import { Box, Flex, Grid, GridItem, Image, Text } from '@chakra-ui/react';
import { setNavbarAllowBack, setNavbarHeading } from '@/slices/navbar';
import CardBlog from '../home/components/CardBlog';
import { mapArticlesToBlogs } from '@/utils/index';
import { useAppDispatch, useAppSelector } from '@/store';
import { setDetailLearningCenter } from '@/slices/cms';
import imagePlaceholder from '@/assets/img/layout/image-placeholder.png';
import BadgeGenerated from '@/components/BadgeGenerated';

const CaseStudy: React.FC = () => {
  const dispatch = useAppDispatch();
  const { detail, caseStudies: { data } } = useAppSelector((glbState) => glbState.cms.learning_center);

  useEffect(() => {
    return () => {
      dispatch(setDetailLearningCenter(null));
    };
  }, []);

  useEffect(() => {
    dispatch(setNavbarHeading(detail?.title || ''));
    dispatch(setNavbarAllowBack(true));
  }, [dispatch, detail]);

  const dataCaseStudies = useMemo(() => mapArticlesToBlogs(data, 'case-studies'), [data]);

  return (
    <Flex direction={'column'} padding={6} gap={8} overflowY={'auto'} maxHeight={'calc(100vh - 80px)'}>
      <Image className="rounded-md object-cover h-[376px] bg-gray-50" src={detail?.largeImageSrc || imagePlaceholder} loading="lazy" />
      <Grid templateColumns="repeat(4, 1fr)" gap={4}>
        <GridItem colSpan={4} className="my-8">
          <Box className="max-w-[800px] m-auto">
            {detail?.category && typeof detail?.category === 'string' && (
              <Flex gap={3}>
                <BadgeGenerated title={detail?.category} className="!bg-gray-300 !rounded-lg" />
              </Flex>
            )}
            <Box className="mt-10">
              <Text fontSize={'40px'} fontWeight={'semibold'} lineHeight={'120%'}>
                {detail?.title}
              </Text>
              <p className="text-secondary mt-4">{detail?.published_at}</p>
            </Box>
            <Box className="mt-10">
              {/* <Text fontSize={'24px'} fontWeight={'semibold'} className="mb-4">
                What is a great blog design?
              </Text> */}
              <Text className="text-sm">{detail?.content}</Text>
            </Box>
          </Box>
        </GridItem>
        <GridItem colSpan={4}>
          <Text className="text-xl font-semibold">Related Posts</Text>
        </GridItem>
        <GridItem colSpan={1}>
          <Flex direction={'column'} gap={4}>
            {dataCaseStudies.map((blog, index) => (
              <CardBlog blog={blog} key={blog.id} />
            ))}
          </Flex>
        </GridItem>
      </Grid>
    </Flex>
  );
};

export default CaseStudy;



