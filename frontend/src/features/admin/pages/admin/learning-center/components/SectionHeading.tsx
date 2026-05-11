import { FC } from 'react';
import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import ArrowRightCircleIcon from '@/shared/icons/ArrowRightCircleIcon';

type SectionHeadingProps = {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
};

const SectionHeading: FC<SectionHeadingProps> = ({ title, description, ctaHref, ctaLabel }) => {
  return (
    <Flex
      direction={{ base: 'column', md: 'row' }}
      justify={{ base: 'flex-start', md: 'space-between' }}
      align={{ base: 'flex-start', md: 'center' }}
      gap={4}
      w="full"
    >
      <Box>
        <Heading as="h2" fontSize="2xl" fontWeight="semibold" color="text.primary">
          {title}
        </Heading>
        <Text mt={2} fontSize="md" color="text.muted" maxW="3xl">
          {description}
        </Text>
      </Box>
      {ctaHref && ctaLabel ? (
        <Button
          as={RouterLink}
          to={ctaHref}
          variant="ghost"
          rightIcon={<ArrowRightCircleIcon />}
          size="sm"
          fontWeight="medium"
        >
          {ctaLabel}
        </Button>
      ) : null}
    </Flex>
  );
};

export default SectionHeading;




