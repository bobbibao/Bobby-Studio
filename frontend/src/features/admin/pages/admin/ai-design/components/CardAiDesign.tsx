import React from 'react';
import { Box, Image, Text, Flex, Badge, useColorModeValue, Tooltip } from '@chakra-ui/react';
import imagePlaceholder from '@/assets/img/layout/image-placeholder.png';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface CardAiDesignProps {
  imageSrc: string;
  title: string;
  subtitle?: string;
  linkToGenerationType?: string;
  status?: 'BETA' | 'COMING SOON';
  category?: string;
  submode?: string;
}

const CardAiDesign: React.FC<CardAiDesignProps> = ({ imageSrc, title, subtitle, linkToGenerationType, status, submode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const hoverBorderColor = useColorModeValue('zinc.400', 'zinc.400');

  const handleGenerateClick = () => {
    if (status === 'COMING SOON') return;

    if (linkToGenerationType === 'Edit') {
      if (submode) {
        navigate(`/generate?tab=workspace&mode=edit&submode=${submode}`);
      } else {
        navigate(`/generate?tab=workspace&mode=edit`);
      }
      return;
    }

    if (submode && linkToGenerationType === 'Image to Animation') {
      navigate(`/generate?mode=generate&submode=${submode}`);
      return;
    }

    if (submode) {
      navigate(`/generate?tab=workspace&mode=generate&submode=${submode}`);
      return;
    }

    navigate(`/generate?tab=workspace&mode=generate`);
  };

  return (
    <Flex
      as="button"
      onClick={handleGenerateClick}
      bg="bg.surface"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="none"
      transition="all 0.2s"
      _hover={{
        borderColor: hoverBorderColor,
        transform: 'scale(1.02)',
        boxShadow: 'sm',
      }}
      width="100%"
      height="140px"
      textAlign="left"
      align="stretch"
      disabled={status === 'COMING SOON'}
      cursor={status === 'COMING SOON' ? 'not-allowed' : 'pointer'}
      opacity={status === 'COMING SOON' ? 0.7 : 1}
      borderWidth="1px"
      borderColor="border.default"
    >
      <Box w="140px" flexShrink={0} position="relative" h="100%">
        <Image src={imageSrc || imagePlaceholder} alt={title} objectFit="cover" w="100%" h="100%" />
      </Box>

      <Flex direction="column" p={4} justify="center" flex={1}>
        <Flex align="center" wrap="wrap" gap={2} mb={1}>
          <Text fontWeight="bold" fontSize="md" color="text.primary">
            {t(`common:${title}`)}
          </Text>
          {status && (
            <Badge colorScheme={status === 'BETA' ? 'brand' : 'brand'} variant="solid" fontSize="xs" borderRadius="md" px={2}>
              {t(`common:${status}`)}
            </Badge>
          )}
        </Flex>

        {subtitle && (
          <Tooltip label={t(`aidesign:${subtitle}`)} placement="top" hasArrow borderRadius="md">
            <Text fontSize="sm" color="text.muted" noOfLines={2}>
              {t(`aidesign:${subtitle}`)}
            </Text>
          </Tooltip>
        )}
      </Flex>
    </Flex>
  );
};

export default CardAiDesign;



