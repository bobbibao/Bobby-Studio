import {
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useColorModeValue,
  Button as ChakraButton,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { Folder } from '@/common/dtos/attribute/common.dto';
import { useTranslation } from 'react-i18next';

interface ModalCreateFolderProps {
  isOpen: boolean;
  editMode?: boolean;
  modelData?: Folder | null;
  onClose: () => void;
  onCreate: (folderName: string) => void;
  onEdit?: (folderName: string) => void;
}

const ModalCreateFolder: React.FC<ModalCreateFolderProps> = ({ isOpen, editMode, onClose, modelData, onCreate, onEdit }) => {
  const { t } = useTranslation();

  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset or set values when modal opens
      setFolderName(modelData?.name || '');
    }
  }, [isOpen, modelData]);

  const handleClose = () => {
    // Reset values when closing
    setFolderName('');
    onClose();
  };

  const handleCreate = () => {
    onCreate(folderName);
    handleClose();
  };

  const handleEdit = () => {
    onEdit?.(folderName);
    handleClose();
  };

  // Glass morphism: use blackAlpha/whiteAlpha for overlay, and zinc colors with opacity for modal
  const modalBg = useColorModeValue('white', 'blackAlpha.800'); // Using blackAlpha for dark mode glass effect
  const borderColor = useColorModeValue('border.default', 'whiteAlpha.200');
  const overlayBg = useColorModeValue('blackAlpha.400', 'blackAlpha.600');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay bg={overlayBg} backdropFilter="blur(4px)" />
      <ModalContent
        bg={modalBg}
        backdropFilter="blur(12px)"
        border="1px solid"
        borderColor={borderColor}
        rounded="xl"
        shadow="xl"
        color="text.primary"
      >
        <ModalHeader 
          bg="transparent"
          borderBottom="1px solid"
          borderColor={borderColor}
          color="text.primary"
          fontSize="lg"
          fontWeight="semibold"
        >
          {t('common:folder')}
        </ModalHeader>
        <ModalBody bg="transparent" color="text.primary">
          <FormControl mb={4}>
            <FormLabel fontWeight="normal" color="text.primary">{t('common:folder_name')}</FormLabel>
            <Input
              rounded="lg"
              placeholder={t('common:folder_name')}
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              bg="bg.surface"
              borderColor="border.default"
              color="text.primary"
              _hover={{ borderColor: 'zinc.400' }}
              _focus={{ borderColor: 'zinc.600', boxShadow: '0 0 0 1px var(--chakra-colors-zinc-600)' }}
              _placeholder={{ color: 'text.muted' }}
            />
          </FormControl>
        </ModalBody>

        <ModalFooter 
          display="flex" 
          justifyContent="space-between" 
          width="100%" 
          gap={3}
          bg="transparent"
          borderTop="1px solid"
          borderColor={borderColor}
        >
          <ChakraButton
            variant="secondary"
            onClick={handleClose}
            flex={1}
          >
            {t('common:cancel')}
          </ChakraButton>
          <ChakraButton
            variant="solid"
            onClick={editMode ? handleEdit : handleCreate}
            isDisabled={!folderName.trim()}
            flex={1}
          >
            {t(`common:${editMode ? 'save' : 'create'}`)}
          </ChakraButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ModalCreateFolder;



