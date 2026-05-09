import { FC } from 'react';
import { AspectRatio, Box, Image, Text } from '@chakra-ui/react';
import imagePlaceholder from '@/assets/img/layout/image-placeholder.png';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '@/store';
import { setDetailLearningCenter } from '@/slices/cms';

export interface IBlog {
  imageSrc: string;
  largeImageSrc: string;
  title: string;
  description: string;
  published_at: string;
  link: string;
  content: string;
  type: string | undefined;
  id: string | number | null;
  category?: string;
}

export interface CardBlogProps {
  blog: IBlog;
}

const CardBlog: FC<CardBlogProps> = ({ blog }) => {
  const dispatch = useAppDispatch();

  return (
    <Box>
      <Link to={blog.link} state={blog} onClick={() => dispatch(setDetailLearningCenter(blog))}>
        <AspectRatio ratio={266 / 177} className="mb-4">
          <Image
            src={blog.imageSrc || imagePlaceholder}
            fallbackSrc={imagePlaceholder}
            alt="Card Image"
            className="w-full rounded-xl object-cover bg-gray-50"
            loading="lazy"
          />
        </AspectRatio>
        <Text fontSize={'md'} fontWeight={'semibold'} marginBottom={1} noOfLines={2}>
          {blog.title}
        </Text>
        <p className="text-sm font-normal text-secondary mb-3 line-clamp-2">{blog.content}</p>
        <p className="text-xs font-normal text-secondary">{blog.published_at}</p>
      </Link>
    </Box>
  );
};

export default CardBlog;



