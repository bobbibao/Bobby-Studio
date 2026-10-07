import { Box, Flex, IconButton, Image, Menu, MenuButton, MenuItem, MenuList, Text, useColorModeValue } from '@chakra-ui/react';
import React, { useEffect } from 'react';
import imagePlaceholder from '../../assets/img/layout/image-placeholder.png';
import ThreeDotIcon from '../icons/ThreeDotIcon';
import { relativeTimeFormat } from '../../utils/time';
import { useTranslation } from 'react-i18next';
import ImagesIcon from '../icons/ImagesIcon';

export interface CardDataProps {
  projectTitle: string;
  projectDescription: string;
  projectAttributeId: string;
  type: string;
  folderName: string;
  folderIndex: number;
  imageId: string;
  imagePath: string;
  updatedAt: string;
  numberOfImages: number;
}

interface CardProjectProps {
  data: CardDataProps;
  onEdit?: (project: CardDataProps) => void;
  onDelete?: (project: CardDataProps) => void;
  onClick?: () => void;
}

const CardProject: React.FC<CardProjectProps> = ({ data, onEdit, onDelete, onClick }) => {
  const { t, i18n } = useTranslation();
  const { updatedAt, imagePath, projectDescription, projectTitle, numberOfImages } = data;

  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.85)', 'rgba(15, 17, 26, 0.85)');
  const borderColor = useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)');
  const hoverBorder = useColorModeValue('rgba(127, 86, 217, 0.5)', 'rgba(139, 92, 246, 0.6)');
  const isViet = i18n.language?.toLowerCase().startsWith('vi');

  return (
    <Box
      id="CardProject"
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="20px"
      overflow="hidden"
      position="relative"
      cursor="pointer"
      onClick={onClick}
      bg={cardBg}
      backdropFilter="blur(20px)"
      display="flex"
      flexDirection="column"
      transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      _hover={{
        borderColor: hoverBorder,
        transform: 'translateY(-4px)',
        boxShadow: '0 20px 40px -12px rgba(127, 86, 217, 0.25)',
      }}
    >
      <Box position="relative" h="200px" overflow="hidden">
        <Image
          src={imagePath ? imagePath : imagePlaceholder}
          w="full"
          h="200px"
          objectFit="cover"
          objectPosition="top"
          alt={projectTitle ? projectTitle : 'N/A'}
          loading="lazy"
          transition="transform 0.5s ease"
          _groupHover={{ transform: 'scale(1.04)' }}
        />
        {/* Subtle gradient vignette */}
        <Box
          position="absolute"
          inset={0}
          bgGradient="linear(to-t, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.3) 100%)"
          pointerEvents="none"
        />

        {/* Floating Asset Count Badge */}
        <Box position="absolute" bottom="12px" left="12px" zIndex="2">
          <Box
            px={2.5}
            py={1}
            borderRadius="full"
            bg="rgba(0, 0, 0, 0.6)"
            backdropFilter="blur(10px)"
            border="1px solid rgba(255, 255, 255, 0.15)"
            color="white"
            fontSize="xs"
            fontWeight="600"
            display="flex"
            alignItems="center"
            gap={1.5}
          >
            <ImagesIcon />
            <span>
              {numberOfImages
                ? `${numberOfImages} ${numberOfImages === 1 ? (isViet ? 'ảnh' : 'asset') : (isViet ? 'ảnh' : 'assets')}`
                : isViet ? '0 ảnh' : '0 assets'}
            </span>
          </Box>
        </Box>

        {/* Absolute position for the Menu Button */}
        <Box position="absolute" top="10px" right="10px" zIndex="10">
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Options"
              icon={<ThreeDotIcon isHovered={false} />}
              variant="ghost"
              size="sm"
              bg="rgba(0, 0, 0, 0.5)"
              backdropFilter="blur(8px)"
              borderRadius="full"
              border="1px solid rgba(255, 255, 255, 0.1)"
              color="white"
              _hover={{ bg: 'rgba(0, 0, 0, 0.75)' }}
              onClick={(e) => e.stopPropagation()}
            />
            <MenuList
              minW="130px"
              bg={useColorModeValue('white', 'zinc.900')}
              borderColor={borderColor}
              backdropFilter="blur(16px)"
              onClick={(e) => e.stopPropagation()}
            >
              <MenuItem
                _hover={{ bg: useColorModeValue('purple.50', 'whiteAlpha.100') }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(data);
                }}
              >
                {t('common:edit')}
              </MenuItem>
              <MenuItem
                color="red.400"
                _hover={{ bg: useColorModeValue('red.50', 'whiteAlpha.100') }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(data);
                }}
              >
                {t('common:delete_')}
              </MenuItem>
            </MenuList>
          </Menu>
        </Box>
      </Box>

      <Box p={5} flex={1} display="flex" flexDirection="column" justifyContent="space-between">
        <Box>
          <Text
            fontSize="md"
            fontWeight="700"
            color="text.primary"
            letterSpacing="-0.01em"
            noOfLines={1}
            title={projectTitle}
          >
            {projectTitle ? projectTitle : '-/-'}
          </Text>
          <Text
            fontSize="xs"
            color="text.muted"
            mt={1.5}
            lineHeight="1.5"
            noOfLines={2}
            title={projectDescription}
          >
            {projectDescription || (isViet ? 'Chưa có mô tả dự án' : 'No description provided')}
          </Text>
        </Box>

        <Flex align="center" justify="space-between" mt={4} pt={3} borderTop="1px solid" borderColor={borderColor}>
          <Text fontSize="2xs" color="text.muted" fontWeight="500">
            {t('edit:edited')} {updatedAt ? relativeTimeFormat(updatedAt, 0, i18n.language) : '-/-'}
          </Text>
          <Box
            w={2}
            h={2}
            borderRadius="full"
            bg="brand.400"
            boxShadow="0 0 8px rgba(127, 86, 217, 0.8)"
          />
        </Flex>
      </Box>
    </Box>
  );
};

export default CardProject;

