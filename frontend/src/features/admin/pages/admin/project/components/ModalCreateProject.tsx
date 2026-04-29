import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  useColorModeValue,
  Button as ChakraButton,
} from '@chakra-ui/react';
import { IProjectItem } from '@/types/project';
import { ProjectAttributeEntity } from '@/common/dtos/attribute/common.dto';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import { ActionEntity } from '@/common/dtos/attribute/common.dto';
import { useTranslation } from 'react-i18next';
import { CreateProjectParams } from '@/types';

interface ModalCreateProjectProps {
  isOpen: boolean;
  editMode: boolean;
  modelData?: UserAttributeEntity<ProjectAttributeEntity, ActionEntity> | null;
  onClose: () => void;
  onCreate?: (createProjectParams: CreateProjectParams) => void;
  onEdit?: (projectName: string, projectDescription: string) => void;
}

const ModalCreateProject: React.FC<ModalCreateProjectProps> = ({ isOpen, editMode, modelData, onClose, onCreate, onEdit }) => {
  const { t } = useTranslation();

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset or set values when modal opens
      setProjectName(modelData?.value?.title || '');
      setProjectDescription(modelData?.value?.description || '');
    }
  }, [isOpen, modelData]);

  const handleClose = () => {
    // Reset values when closing
    setProjectName('');
    setProjectDescription('');
    onClose();
  };

  const handleCreate = () => {
    const cPPs: CreateProjectParams = {
      projectName,
      projectDescription,
    };
    onCreate?.(cPPs);
    handleClose();
  };

  const handleEdit = () => {
    onEdit?.(projectName, projectDescription);
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
          {t('common:project')}
        </ModalHeader>
        <ModalBody bg="transparent" color="text.primary">
          <FormControl mb={4}>
            <FormLabel fontWeight="normal" color="text.primary">{t('common:project_name')}</FormLabel>
            <Input
              rounded="lg"
              placeholder={t('common:project_name')}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              bg="bg.surface"
              borderColor="border.default"
              color="text.primary"
              _hover={{ borderColor: 'zinc.400' }}
              _focus={{ borderColor: 'zinc.600', boxShadow: '0 0 0 1px var(--chakra-colors-zinc-600)' }}
              _placeholder={{ color: 'text.muted' }}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontWeight="normal" color="text.primary">{t('common:project_description')}</FormLabel>
            <Textarea
              rounded="lg"
              placeholder={t('common:project_description')}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
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
            isDisabled={!projectName.trim()}
            flex={1}
          >
            {t(`common:${editMode ? 'save' : 'create'}`)}
          </ChakraButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ModalCreateProject;



