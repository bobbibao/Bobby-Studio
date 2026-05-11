import { AspectRatio, Box, IconButton, Image, Text } from '@chakra-ui/react';
import { FC } from 'react';
import imagePlaceholder from '@/assets/img/layout/image-placeholder.png';
import BadgeGenerated from '@/components/BadgeGenerated';
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
}

const CardVideoTextOutside: FC<CardVideoProps> = ({ video }) => {
  const dispatch = useAppDispatch();

  const onClickWatchVideo = () => {
    dispatch(setDetailLearningCenter(video));
  };
  return (
    <Box marginBottom={'4'}>
      <Box position={'relative'}>
        <Image
          src={video.imageSrc || imagePlaceholder}
          fallbackSrc={imagePlaceholder}
          alt="Card Image"
          className="w-full rounded-xl mb-4"
          loading="lazy"
        />
        <Link to={`/learning-center/videos/${video.id}`}>
          <IconButton
            position={'absolute'}
            variant={'ghost'}
            zIndex={1}
            size={'lg'}
            top={'50%'}
            left={'50%'}
            transform={'translate(-50%,-50%)'}
            bgColor={'#ffffff4c'}
            aria-label="Play Video"
            icon={<TriangleRightIcon />}
            onClick={onClickWatchVideo}
          />
        </Link>
      </Box>
      <Link to={`/learning-center/videos/${video.id}`} onClick={onClickWatchVideo}>
        <Text fontSize={'md'} fontWeight={'semibold'} marginBottom={3} noOfLines={2}>
          {video.title}
        </Text>
      </Link>
      <BadgeGenerated title={video.type} />
    </Box>
  );
};

export default CardVideoTextOutside;



