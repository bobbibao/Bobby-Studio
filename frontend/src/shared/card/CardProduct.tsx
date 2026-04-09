import React from 'react';
import { Box, Image, Text } from '@chakra-ui/react';
import Button from '../buttons/Button';
import imagePlaceholder from '../../assets/img/layout/image-placeholder.png';

interface CardProductProps {
  imageSrc: string;
  title: string;
  subtitle: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

const CardProduct: React.FC<CardProductProps> = ({
  imageSrc,
  title,
  subtitle,
  buttonText,
  onButtonClick,
}) => {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="lg"
      className="max-w-[305px] dark:border-[#2E2E2E]"
    >
      <Image
        src={imageSrc || imagePlaceholder}
        className="w-full"
        alt={title}
        loading="lazy"
      />

      <Box p="4" className="dark:bg-gray-900">
        <Text
          fontWeight="bold"
          fontSize="xl"
          className="text-txtPrimary dark:text-white"
        >
          {title}
        </Text>
        {subtitle && (
          <Text mt="1" className="text-[#6C757D]">
            {subtitle}
          </Text>
        )}
        {buttonText && (
          <Button
            extraClass="border-[1px] !border-black !rounded-3xl px-6 !py-1 text-base !bg-[transparent] !text-black mt-4 dark:!text-white  dark:!border-borderPrimary"
            onClick={onButtonClick}
            label={buttonText}
          />
        )}
        <div className="px-6 py-1"></div>
      </Box>
    </Box>
  );
};

export default CardProduct;

