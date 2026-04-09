import { Box, IconButton, Image, Menu, MenuButton, MenuItem, MenuList, Text, useColorModeValue } from '@chakra-ui/react';
import React, { useEffect } from 'react';
import imagePlaceholder from '../../assets/img/layout/image-placeholder.png';
import ThreeDotIcon from '../icons/ThreeDotIcon';
import { ActionEntity, ProjectAttributeEntity } from '@/common/dtos/attribute/common.dto';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
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
  onEdit?: (project: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>) => void;
  onDelete?: (project: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>) => void;
  onClick?: () => void;
}

const CardProject: React.FC<CardProjectProps> = ({ data, onEdit, onDelete, onClick }) => {
  const { t, i18n } = useTranslation();
  const { updatedAt, imagePath, projectDescription, projectTitle, numberOfImages } = data;

  const borderColor = useColorModeValue('border.default', 'border.default');
  const hoverBorderColor = useColorModeValue('zinc.400', 'zinc.400');

  return (
    <Box
      id="CardProject"
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="14"
      overflow="hidden"
      position="relative"
      cursor="pointer"
      onClick={onClick}
      bg={useColorModeValue('white', 'zinc.900')}
      display="flex"
      flexDirection="column"
      transition="border-color 0.2s"
      _hover={{
        borderColor: hoverBorderColor,
      }}
    >
      <Box position="relative" h="190px">
        <Image
          src={imagePath ? imagePath : imagePlaceholder}
          w="full"
          h="190px"
          objectFit="cover"
          objectPosition="top"
          alt={projectTitle ? projectTitle : 'N/A'}
          loading="lazy"
        />
        {/* Absolute position for the Menu Button */}
        <Box position="absolute" top="0" right="0" padding="8px" zIndex="10">
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Options"
              icon={<ThreeDotIcon isHovered={false} />}
              variant="ghost"
              size="sm"
              bg="transparent"
              _hover={{ bg: 'transparent' }}
              onClick={(e) => e.stopPropagation()}
            />
            <MenuList style={{ width: '112px' }} onClick={(e) => e.stopPropagation()}>
              <MenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(data);
                }}
              >
                {t('common:edit')}
              </MenuItem>
              <MenuItem
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

      <Box className="p-4 flex flex-col" flexShrink={0}>
        <div>
          <Text
            className="text-txtPrimary dark:text-white font-semibold text-base"
            noOfLines={1} // Truncate after 1 line
            title={projectTitle} // Show full title on hover
          >
            {projectTitle ? projectTitle : '-/-'}
          </Text>
          <Text
            className="text-[#6C757D] text-sm mt-1"
            noOfLines={2} // Show max 2 lines
            title={projectDescription} // Show full description on hover
          >
            {projectDescription || '-/-'}
          </Text>
        </div>
        <div className="flex items-center justify-between mt-10">
          {/* {type && <BadgeGenerationType generationType={type} />} */}
          {
            <div className="flex gap-2 items-center">
              <ImagesIcon />
              <span className="text-[14px] text-[#6C757D] text-ellipsis">{`${
                numberOfImages
                  ? `${numberOfImages} ${numberOfImages === 1 ? `${t('common:image')}` : `${t('profile:images')}`}`
                  : '-/-'
              }`}</span>
            </div>
          }
          <span className="text-[12px] text-[#6C757D] text-ellipsis">{`${t('edit:edited')} ${
            updatedAt ? relativeTimeFormat(updatedAt, 0, i18n.language) : '-/-'
          }`}</span>
        </div>
      </Box>
    </Box>
  );
};

export default CardProject;

