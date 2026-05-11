import { useEffect, useMemo } from 'react';
import { AspectRatio, Box, Flex, Grid, GridItem, ListItem, Text, UnorderedList } from '@chakra-ui/react';
import { setNavbarAllowBack, setNavbarHeading } from '@/slices/navbar';
import CardVideoTextOutside from '@/components/CardVideoTextOutside';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useAppDispatch, useAppSelector } from '@/store';
import { mapArticlesToBlogs } from '@/utils';
import { setDetailLearningCenter } from '@/slices/cms';
import BadgeGenerated from '@/components/BadgeGenerated';
import CardBlog from '@/features/admin/pages/admin/home/components/CardBlog';

const isNewUI = true;

const Video: React.FC = () => {
  const dispatch = useAppDispatch();
  const { detail, videos: { data } } = useAppSelector((glbState) => glbState.cms.learning_center);

  useEffect(() => {
    return () => {
      dispatch(setDetailLearningCenter(null));
    };
  }, []);

  useEffect(() => {
    dispatch(setNavbarHeading(detail?.title || ''));
    dispatch(setNavbarAllowBack(true));
  }, [dispatch, detail]);

  const dataVideos = useMemo(() => mapArticlesToBlogs(data, 'videos'), [data]);

  if (isNewUI)
    return (
      <Flex direction={'column'} padding={6} gap={8} overflowY={'auto'} maxHeight={'calc(100vh - 80px)'}>
        <AspectRatio ratio={16 / 9}>
          <VideoPlayer source={detail?.content} />
        </AspectRatio>
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
              {dataVideos.map((blog, index) => (
                <CardBlog blog={blog} key={blog.id} />
              ))}
            </Flex>
          </GridItem>
        </Grid>
      </Flex>
    );

  return (
    <Flex direction={'column'} padding={6} gap={8} overflowY={'auto'} maxHeight={'calc(100vh - 80px)'}>
      <Grid templateColumns="repeat(4, 1fr)" gap={4}>
        <GridItem colSpan={3}>
          <Flex direction={'column'} gap={10}>
            <AspectRatio ratio={16 / 9}>
              <VideoPlayer source={detail?.content} />
            </AspectRatio>
            <Box>
              <Text fontSize={'40px'} fontWeight={'semibold'} lineHeight={'120%'} mb={1}>
                {detail?.title}
              </Text>
              <p className="text-secondary">Published: {detail?.published_at}</p>
            </Box>
            <Flex direction={'column'} gap={6}>
              <Box>
                <Text fontSize={'24px'} lineHeight={'120%'} fontWeight={'semibold'}>
                  1. Introduction to AI for Converting Line Drawings
                </Text>
                <UnorderedList marginInlineStart={6}>
                  <ListItem>Brief overview of how AI can transform line sketches into realistic images.</ListItem>
                  <ListItem>Benefits of using AI, such as time-saving and enhanced image quality.</ListItem>
                </UnorderedList>
              </Box>
              <Box>
                <Text fontSize={'24px'} lineHeight={'120%'} fontWeight={'semibold'}>
                  2. Introduction to AI Tools for Line Drawing to Image
                </Text>
                <Text>The Bobby dashboard is your main hub. Here’s what you’ll find:</Text>
                <UnorderedList marginInlineStart={6}>
                  <ListItem>Project Library: Access and manage all your saved projects.</ListItem>
                  <ListItem>AI Design Assistant: Begin creating by selecting templates or starting from scratch.</ListItem>
                  <ListItem>Resource Library: Browse textures, colors, and design elements.</ListItem>
                </UnorderedList>
              </Box>
              <Box>
                <Text fontSize={'24px'} lineHeight={'120%'} fontWeight={'semibold'}>
                  3. Creating Your First Project
                </Text>
                <Text>Let’s dive into creating your first AI-generated interior design.</Text>
                <UnorderedList marginInlineStart={6}>
                  <ListItem>Step 1: Select "New Project" and choose a room type (e.g., Living Room, Office).</ListItem>
                  <ListItem>
                    Step 2: Upload any reference images or sketches you have. Bobby’s AI can interpret these to generate styles.
                  </ListItem>
                  <ListItem>
                    Step 3: Customize the look and feel using Bobby’s real-time editing features to change textures, colors, and
                    lighting.
                  </ListItem>
                </UnorderedList>
              </Box>
            </Flex>
          </Flex>
        </GridItem>
        <GridItem colSpan={1}>
          <Flex direction={'column'} gap={4}>
            {dataVideos.map((video, index) => (
              <CardVideoTextOutside video={video} key={index} />
            ))}
          </Flex>
        </GridItem>
      </Grid>
    </Flex>
  );
};

export default Video;



