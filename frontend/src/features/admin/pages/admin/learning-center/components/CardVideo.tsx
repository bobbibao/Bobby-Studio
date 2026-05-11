import { FC } from 'react';
import { Box, Button, Flex, IconButton, Image, Text } from '@chakra-ui/react';
import imagePlaceholder from '@/assets/img/layout/image-placeholder.png';
import BadgeGenerated from '@/components/BadgeGenerated';
import ArrowRightCircleIcon from '@/shared/icons/ArrowRightCircleIcon';
import TriangleRightIcon from '@/shared/icons/TriangleRightIcon';
import { Link } from 'react-router-dom';
import { IBlog } from '@/features/admin/pages/admin/home/components/CardBlog';
import { useAppDispatch } from '@/store';
import { setDetailLearningCenter } from '@/slices/cms';

export interface IVideo {
  imageSrc: string;
  title: string;
  type?: string;
}

export interface CardVideoProps {
  video: IVideo & IBlog;
  variant?: 'standard' | 'featured';
}

const CardVideo: FC<CardVideoProps> = ({ video, variant = 'standard' }) => {
  const dispatch = useAppDispatch();

  const onClickWatchVideo = () => {
    dispatch(setDetailLearningCenter(video));
  };
  const minHeight = variant === 'featured' ? { base: '250px', md: '420px' } : { base: '220px', md: '260px' };

  return (
    <Box position="relative" borderRadius="xl" overflow="hidden" minH={minHeight}>
      <Image
        src={video.imageSrc || imagePlaceholder}
        fallbackSrc={imagePlaceholder}
        alt={video.title}
        objectFit="cover"
        w="100%"
        h="100%"
        loading="lazy"
      />

      <Box
        position="absolute"
        inset={0}
        bgGradient={variant === 'featured' ? 'linear(to-b, rgba(0,0,0,0.1), rgba(0,0,0,0.85))' : 'linear(to-b, rgba(0,0,0,0.2), rgba(0,0,0,0.8))'}
      />

      <Flex position="absolute" inset={0} direction="column" justify="space-between" p={{ base: 5, md: 6 }} color="white" gap={4}>
        <Flex direction="column" gap={3} maxW="90%">
          <Text fontSize={variant === 'featured' ? '2xl' : 'xl'} fontWeight="semibold" noOfLines={2}>
            {video.title}
          </Text>
          <BadgeGenerated title={video.type} />
        </Flex>
        <Flex justify="space-between" align="flex-end" gap={4} wrap="wrap">
          <Link to={`/learning-center/videos/${video.id}`} onClick={onClickWatchVideo}>
            <Button
              variant="outline"
              color="white"
              borderColor="whiteAlpha.700"
              size="sm"
              rightIcon={<ArrowRightCircleIcon color="white" />}
              _hover={{ bg: 'whiteAlpha.200' }}
            >
              Watch the Video
            </Button>
          </Link>
          <Link to={`/learning-center/videos/${video.id}`}>
            <IconButton
              size="lg"
              aria-label="Play Video"
              icon={<TriangleRightIcon />}
              bg="whiteAlpha.300"
              color="white"
              _hover={{ bg: 'whiteAlpha.500' }}
            />
          </Link>
        </Flex>
      </Flex>
    </Box>
  );
};

export default CardVideo;



