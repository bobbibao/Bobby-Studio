import React from 'react';
import { Box, Flex, Text, Badge, useColorModeValue } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface QuickActionCardProps {
  title: string;
  icon: React.ReactElement;
  isNew?: boolean;
  badgeLabel?: string;
  onClick?: () => void;
  linkTo?: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, icon, isNew, badgeLabel, onClick, linkTo }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hoverBorderColor = useColorModeValue('zinc.400', 'zinc.400');

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (linkTo) {
      navigate(linkTo);
    }
  };

  return (
    <Flex
      as="button"
      onClick={handleClick}
      bg="bg.surface"
      borderRadius="lg"
      p={4}
      align="center"
      justify="flex-start"
      borderWidth="1px"
      borderColor="border.default"
      color="text.primary"
      transition="all 0.2s"
      _hover={{
        borderColor: hoverBorderColor,
        transform: 'scale(1.02)',
        boxShadow: 'sm',
      }}
      _active={{
        transform: 'scale(0.98)',
      }}
      height="60px"
      width="100%"
      gap={3}
    >
      <Box color="text.primary">{icon}</Box>
      <Text fontWeight="600" fontSize="sm" color="text.primary" textAlign="left">
        {t(`common:${title}`)}
      </Text>
      {isNew && (
        <Badge
          bg="brand.600"
          color="white"
          fontSize="xs"
          borderRadius="full"
          px={3}
          py={1}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          lineHeight="1"
        >
          {badgeLabel || t('common:new_badge')}
        </Badge>
      )}
    </Flex>
  );
};

export default QuickActionCard;



