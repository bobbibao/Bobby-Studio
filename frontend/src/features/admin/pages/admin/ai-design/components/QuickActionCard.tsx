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

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (linkTo) {
      navigate(linkTo);
    }
  };

  const iconBg = useColorModeValue('rgba(127, 86, 217, 0.08)', 'rgba(139, 92, 246, 0.15)');

  return (
    <Flex
      as="button"
      onClick={handleClick}
      bg="bg.surface"
      borderRadius="16px"
      p={3.5}
      align="center"
      justify="flex-start"
      borderWidth="1px"
      borderColor="border.default"
      color="text.primary"
      transition="all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
      _hover={{
        borderColor: 'brand.400',
        transform: 'translateY(-2px)',
        boxShadow: useColorModeValue(
          '0 10px 25px -5px rgba(127, 86, 217, 0.15)',
          '0 12px 28px -5px rgba(127, 86, 217, 0.35)'
        ),
      }}
      _active={{
        transform: 'translateY(0)',
      }}
      height="64px"
      width="100%"
      gap={3}
    >
      <Box
        w="38px"
        h="38px"
        borderRadius="12px"
        bg={iconBg}
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="brand.500"
        flexShrink={0}
      >
        {icon}
      </Box>
      <Text fontWeight="600" fontSize="sm" color="text.primary" textAlign="left" flex={1}>
        {t(`common:${title}`, { defaultValue: title.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) })}
      </Text>
      {isNew && (
        <Badge
          bg="brand.600"
          color="white"
          fontSize="xs"
          borderRadius="full"
          px={2.5}
          py={0.5}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          lineHeight="1"
          boxShadow="0 2px 8px rgba(127, 86, 217, 0.4)"
        >
          {badgeLabel || t('common:new_badge')}
        </Badge>
      )}
    </Flex>
  );
};

export default QuickActionCard;
