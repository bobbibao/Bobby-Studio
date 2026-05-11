import { FC } from 'react';
import { AspectRatio, Box, Image, Text } from '@chakra-ui/react';
import imagePlaceholder from '@/assets/img/layout/image-placeholder.png';
import BadgeGenerated from '@/components/BadgeGenerated';
import { Link } from 'react-router-dom';
import { IBlog } from '@/features/admin/pages/admin/home/components/CardBlog';
import { useAppDispatch } from '@/store';
import { setDetailLearningCenter } from '@/slices/cms';

export interface ITutorial {
  imageSrc: string;
  largeImageSrc?: string;
  title: string;
  type?: string;
  description: string;
  content?: string;
}

export interface CardTutorialProps {
  tutorial: ITutorial & IBlog;
}

const CardTutorial: FC<CardTutorialProps> = ({ tutorial }) => {
  const dispatch = useAppDispatch();
  return (
    <Box
      bg="bg.surface"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border.default"
      p={4}
      display="flex"
      flexDirection="column"
      gap={3}
    >
      <AspectRatio ratio={266 / 177}>
        <Image
          src={tutorial.imageSrc || imagePlaceholder}
          fallbackSrc={imagePlaceholder}
          alt={tutorial.title}
          borderRadius="lg"
          objectFit="cover"
          loading="lazy"
        />
      </AspectRatio>
      <Link
        to={`/learning-center/tutorials/${tutorial.id}`}
        state={tutorial}
        onClick={() => dispatch(setDetailLearningCenter(tutorial))}
      >
        <Text fontSize="lg" fontWeight="semibold" color="text.primary" noOfLines={2}>
          {tutorial.title}
        </Text>
      </Link>
      <BadgeGenerated title={tutorial.type} />
    </Box>
  );
};

export default CardTutorial;



