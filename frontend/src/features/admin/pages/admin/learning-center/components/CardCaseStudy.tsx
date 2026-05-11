import { FC } from 'react';
import { AspectRatio, Box, Button, Flex, Image, Text } from '@chakra-ui/react';
import imagePlaceholder from '@/assets/img/layout/image-placeholder.png';
import BadgeGenerated from '@/components/BadgeGenerated';
import ArrowRightCircleIcon from '@/shared/icons/ArrowRightCircleIcon';
import { Link } from 'react-router-dom';
import { IBlog } from '@/features/admin/pages/admin/home/components/CardBlog';
import { useAppDispatch } from '@/store';
import { setDetailLearningCenter } from '@/slices/cms';

export interface ICaseStudy {
  imageSrc: string;
  title: string;
  type: string | undefined;
}

export interface CardCaseStudyProps {
  caseStudy: ICaseStudy & IBlog;
  hasReadMoreIcon?: boolean;
}

const CardCaseStudy: FC<CardCaseStudyProps> = ({ caseStudy, hasReadMoreIcon = false }) => {
  const dispatch = useAppDispatch();
  const onClickReadMore = () => {
    dispatch(setDetailLearningCenter(caseStudy));
  };
  return (
    <Box position="relative" borderRadius="xl" overflow="hidden">
      <AspectRatio ratio={266 / 177}>
        <Image
          src={caseStudy.imageSrc || imagePlaceholder}
          fallbackSrc={imagePlaceholder}
          alt={caseStudy.title}
          objectFit="cover"
          loading="lazy"
        />
      </AspectRatio>
      <Box
        position="absolute"
        inset={0}
        bgGradient="linear(to-b, rgba(0,0,0,0.2), rgba(0,0,0,0.8))"
        borderRadius="inherit"
      />
      <Flex
        position="absolute"
        inset={0}
        direction="column"
        justify="space-between"
        p={6}
        color="white"
      >
        <Flex direction="column" gap={2}>
          <Text fontSize="lg" fontWeight="semibold" noOfLines={2}>
            {caseStudy.title}
          </Text>
          <BadgeGenerated title={caseStudy.type} />
        </Flex>
        <Link to={`/learning-center/case-studies/${caseStudy.id}`} onClick={onClickReadMore}>
          <Button
            variant="outline"
            color="white"
            borderColor="whiteAlpha.700"
            rightIcon={hasReadMoreIcon ? <ArrowRightCircleIcon color="white" /> : undefined}
            size="sm"
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            Read Now
          </Button>
        </Link>
      </Flex>
    </Box>
  );
};

export default CardCaseStudy;



