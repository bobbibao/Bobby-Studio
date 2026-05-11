import { AspectRatio, Box, Image, Text } from '@chakra-ui/react';
import { FC } from 'react';
import imagePlaceholder from '@/assets/img/layout/image-placeholder.png';

export interface IModel {
  imageSrc: string;
  title: string;
  description: string;
}

export interface CardModelProps {
  model: IModel;
  onClickModel: (type: string) => void;
}

const CardModel: FC<CardModelProps> = ({ model, onClickModel }) => {
  return (
    <Box
      onClick={() => onClickModel(model.title)}
      role="button"
      bg="bg.surface"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border.default"
      p={4}
      transition="all 0.2s ease"
      cursor="pointer"
      _hover={{ transform: 'translateY(-4px)', boxShadow: 'lg' }}
    >
      <AspectRatio ratio={266 / 177} mb={4}>
        <Image
          src={model.imageSrc || imagePlaceholder}
          fallbackSrc={imagePlaceholder}
          alt={model.title}
          borderRadius="lg"
          objectFit="cover"
          loading="lazy"
        />
      </AspectRatio>
      <Text fontSize="lg" fontWeight="semibold" color="text.primary" mb={2} noOfLines={2}>
        {model.title}
      </Text>
      <Text fontSize="sm" color="text.muted" noOfLines={2}>
        {model.description}
      </Text>
    </Box>
  );
};

export default CardModel;



