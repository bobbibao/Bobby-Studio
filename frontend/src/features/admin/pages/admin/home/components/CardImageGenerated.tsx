import { Avatar, Box, Flex, Image, Text } from '@chakra-ui/react';
import { FC } from 'react';
import imagePlaceholder from '@/assets/img/layout/image-placeholder.png';
import avatarPlaceholder from '@/assets/img/layout/avatar-placeholder.png';
import ArrowRight from '@/shared/icons/ArrowRight';

export interface CardImageGeneratedProps {
  imageSrc?: string;
  userAvatar?: string;
  userName?: string;
  generationType?: string;
  link?: string;
}

const CardImageGenerated: FC<CardImageGeneratedProps> = ({
  imageSrc,
  userAvatar = avatarPlaceholder,
  userName,
  generationType,
  link,
}) => {
  return (
    <Box className="relative w-full shadow-md rounded-lg overflow-hidden group">
      {/* Card Image */}
      <Image
        src={imageSrc}
        fallbackSrc={imagePlaceholder}
        alt="Card Image"
        className="w-full h-full rounded-lg"
        loading="lazy"
      />

      {/* Hover Area */}
      <Box className="absolute bottom-0 left-0 w-full h-full gradient-cover flex items-end">
        <Flex
          justifyContent={'space-between'}
          alignItems={'flex-end'}
          padding={8}
          gap={4}
          width={'full'}
          wrap={'wrap'}
        >
          <Flex gap={2} wrap={'wrap'}>
            <Avatar size="sm" name={userName} src={userAvatar} />
            <Flex direction="column">
              <Text
                fontSize="xl"
                fontWeight={'semibold'}
                className="text-white"
              >
                {userName}
              </Text>
              <Text fontSize="sm" className="text-white">
                {generationType}
              </Text>
            </Flex>
          </Flex>
          <button title={''} className="size-8 rounded-full border border-borderLight dark:border-borderDark bg-white/10 backdrop-blur-[2px] flex items-center justify-center">
            <ArrowRight />
          </button>
        </Flex>
      </Box>
    </Box>
  );
};

export default CardImageGenerated;



