import React from 'react';
import { Badge, Box, Image, Text } from '@chakra-ui/react';
import imagePlaceholder from '../../assets/img/layout/image-placeholder.png';
import { BadgeGenerationType } from '@/components/BadgeGenerationType';

interface CardAiDesignProps {
  imageSrc: string;
  title: string;
  subtitle?: string;
  generationType?: string;
}

const CardAiDesign: React.FC<CardAiDesignProps> = ({
  imageSrc,
  title,
  subtitle,
  generationType,
}) => {
  return (
    <Box
      borderRadius="lg"
      overflow="hidden"
      boxShadow="none"
      className="max-w-[305px] dark:border-[#2E2E2E]"
    >
      <Image
        src={imageSrc || imagePlaceholder}
        className="w-full rounded-lg"
        alt={title}
        loading="lazy"
      />

      <Box className="mt-4">
        <Text fontWeight="bold" className="text-txtPrimary dark:text-white">
          {title}
        </Text>
        {subtitle && (
          <Text mt="1" className="text-[#6C757D] text-sm line-clamp-2">
            {subtitle}
          </Text>
        )}
        {generationType && (
          <div className="mt-1">
            <BadgeGenerationType generationType={generationType} />
          </div>
        )}
        <div className="px-6 py-1"></div>
      </Box>
    </Box>
  );
};

export default CardAiDesign;

