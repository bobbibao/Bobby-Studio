import React from 'react';
import { Box, Flex, Image, Text } from '@chakra-ui/react';
import imagePlaceholder from '../../assets/img/layout/image-placeholder.png';
import ArrowRight from '../../shared/icons/ArrowRight';
import PlayIcon from '../../shared/icons/PlayIcon';
import { BadgeGenerationType } from '@/components/BadgeGenerationType';

interface CardVideoProps {
  imageSrc: string;
  title: string;
  generationType: string;
}

const CardVideo: React.FC<CardVideoProps> = ({
  imageSrc,
  title,
  generationType,
}) => {
  return (
    <Box
      borderRadius="lg"
      overflow="hidden"
      boxShadow="none"
      className={`dark:border-[#2E2E2E] relative h-full`}
    >
      <Image
        src={imageSrc || imagePlaceholder}
        className="w-full rounded-lg h-full"
        alt={title}
        loading="lazy"
      />

      <div className="absolute inset-0 bg-black/30 transition-opacity duration-300 group-hover:bg-black/40" />

      <div className="absolute inset-x-0 bottom-0 p-6 space-y-3 flex flex-col justify-between h-full">
        <Flex direction="column">
          <Text fontWeight="semibold" fontSize="xl" className="text-white">
            {title}
          </Text>
          <div className="mt-1">
            <BadgeGenerationType generationType={generationType} />
          </div>
        </Flex>
        <div>
          <button className="flex items-center gap-2 px-4 py-2 border border-white rounded-full bg-white/30 text-white hover:bg-white/60 transition-colors">
            <span>Watch the Video</span>
            <ArrowRight />
          </button>
        </div>
      </div>

      <button className="absolute bottom-6 right-6 w-12 h-12 flex items-center justify-center rounded-lg bg-white/30 text-gray-800 hover:bg-white/60 transition-colors">
        <PlayIcon />
      </button>
    </Box>
  );
};

export default CardVideo;

