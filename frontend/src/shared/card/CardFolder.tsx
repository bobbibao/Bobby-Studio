import { Box, IconButton, Menu, MenuButton, MenuItem, MenuList, Portal, Text, useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import ThreeDotIcon from '../icons/ThreeDotIcon';
import { IFolderItem } from '../../types/project';
import { shortDateFormat } from '../../utils/time';
import { Folder } from '@/common/dtos/attribute/common.dto';
import { useTranslation } from 'react-i18next';

interface CardFolderProps {
  // id: number;
  name: string;
  updatedAt: string;
  onClick?: (value?: Folder) => void;
  onDelete?: (name: string) => void;
  onEdit?: () => void;
}

const CardFolder: React.FC<CardFolderProps> = ({
  // id,
  name,
  updatedAt,
  onClick,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();

  const borderColor = useColorModeValue('border.default', 'border.default');
  const hoverBorderColor = useColorModeValue('zinc.400', 'zinc.400');

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleEdit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(name);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Box
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      overflow="hidden"
      minW="260px"
      maxW="300px"
      p={4}
      shadow="sm"
      cursor="pointer"
      onClick={handleClick}
      position="relative"
      bg={useColorModeValue('white', 'zinc.900')}
      transition="border-color 0.2s"
      role="group"
      _hover={{
        borderColor: hoverBorderColor,
      }}
    >
      <Text color="text.primary" fontWeight="semibold" fontSize="sm" noOfLines={1} pr="30px" title={name}>
        {name}
      </Text>
      <Text color="text.muted" fontWeight="semibold" fontSize="sm" mt={2}>
        {`${t('edit:edited')} ${updatedAt ? shortDateFormat(updatedAt) : '-/-'}`}
      </Text>
      <Box position="absolute" top="8px" right="8px" opacity={0} transition="opacity 0.2s" _groupHover={{ opacity: 1 }}>
        <Menu>
          <MenuButton
            as={IconButton}
            icon={<ThreeDotIcon />}
            variant="ghost"
            aria-label="Options"
            size="sm"
            bg="transparent"
            _hover={{ bg: 'bg.subtle' }}
            onClick={handleMenuClick}
          />
          <Portal>
            <MenuList>
              <MenuItem onClick={handleEdit}>{t('common:edit')}</MenuItem>
              <MenuItem onClick={handleDelete}>{t('common:delete_')}</MenuItem>
            </MenuList>
          </Portal>
        </Menu>
      </Box>
    </Box>
  );
};

export default CardFolder;

