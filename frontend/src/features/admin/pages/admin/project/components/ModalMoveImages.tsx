import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Stack, Text, Box, Flex } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import Button from '@/shared/buttons/Button';
import { ActionEntity, ProjectAttributeEntity } from '@/common/dtos/attribute/common.dto';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import FolderIconBlack from '@/shared/icons/FolderIconBlack';
import FolderIconWhite from '@/shared/icons/FolderIconWhite';
import ChevronRightIcon from '@/shared/icons/ChevronRightIcon';
import ChevronLeftIcon from '@/shared/icons/ChevronLeftIcon';
import { useToast, useColorMode } from '@chakra-ui/react';

import { MoveImagesToFolderAction, SelectedMovingImageState } from '@/types/project';
import { useTranslation } from 'react-i18next';

interface SelectedFolder {
  projectId: string;
  folderName: string;
  folderIndex: number;
}

interface ModalMoveImagesProps {
  isOpen: boolean;
  selectedImages: SelectedMovingImageState[]; // Array of images to move
  projects: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[];
  onClose: () => void;
  onMove?: (payloads: MoveImagesToFolderAction) => void;
}

const ModalMoveImages: React.FC<ModalMoveImagesProps> = ({ isOpen, selectedImages, projects, onClose, onMove }) => {
  const { t } = useTranslation();
  const { colorMode } = useColorMode();

  const [selectedProject, setSelectedProject] = useState<UserAttributeEntity<ProjectAttributeEntity, ActionEntity> | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<SelectedFolder | null>(null);

  const [moveImagesPayload, setMoveImagesPayload] = useState<any | null>(null);
  const [moveImagesToFolderAction, setMoveImagesToFolderAction] = useState<MoveImagesToFolderAction | null>(null);

  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setSelectedProject(null);
      setSelectedFolder(null);
      // setMoveImagesPayload(null);
    }
  }, [isOpen]);

  const handleSelectProject = (projectId: string) => {
    const found = projects.find(
      (project) => project.attributeId === projectId && project.value?.folders && project.value?.folders.length > 0
    );

    if (found) {
      setSelectedProject(found);
      return;
    }
    toast({
      title: t('common:info'),
      description: t('notification:this_project_does_not_have_any_folders'),
      status: 'warning',
      duration: 5000,
      position: 'bottom-right',
      isClosable: true,
    });
  };

  const handleSelectFolder = (folderIndex: number, folderName: string, attributeId: string) => {
    setSelectedFolder({
      projectId: attributeId,
      folderName: folderName,
      folderIndex: folderIndex,
    });

    setMoveImagesToFolderAction({
      from: {
        folderName: selectedImages[0]?.folderName || '',
        projectId: selectedImages[0]?.projectId || '',
        folderIndex: selectedImages[0]?.folderIndex ?? 0,
      },
      to: {
        folderName: folderName,
        projectId: attributeId,
        folderIndex: folderIndex,
      },
      selectedImages: selectedImages, // filter out undefined/null
    });
  };

  const onPrev = () => {
    setSelectedProject(null);
    // setSelectedFolder(null);
    // setMoveImagesPayload(null);
  };

  const handleMoveImages = () => {
    if (!moveImagesToFolderAction || moveImagesToFolderAction.selectedImages.length === 0) {
      toast({
        title: 'Error',
        description: 'No images selected to move.',
        status: 'error',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
      return;
    }

    // Check if trying to move to the same location
    if (
      moveImagesToFolderAction.from.projectId === moveImagesToFolderAction.to.projectId &&
      moveImagesToFolderAction.from.folderIndex === moveImagesToFolderAction.to.folderIndex
    ) {
      toast({
        title: 'Warning',
        description: 'Images are already in the selected folder.',
        status: 'warning',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
      return;
    }

    if (moveImagesToFolderAction) {
      onMove?.(moveImagesToFolderAction);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent className="!rounded-xl">
        <ModalHeader className="flex flex-col items-start !pb-0">{t('common:move_images')}</ModalHeader>
        <ModalBody>
          <Stack direction="row">
            <Text textStyle="sm">{t('common:current_location')}:</Text>
            <Text fontWeight="bold">
              {selectedImages && selectedImages.length > 0 ? selectedImages[0].folderName : ''}
              {selectedImages && selectedImages.length > 1 ? ` +${selectedImages.length - 1} more` : ''}
            </Text>
          </Stack>

          {!selectedProject && (
            <Box className="flex flex-col gap-6 mt-6 h-[318px] overflow-y-auto">
              {projects.map((project, index) => (
                <Box
                  key={index}
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => handleSelectProject(project.attributeId as string)}
                >
                  <Flex gap={2} justifyContent="center" alignItems="center">
                    {colorMode === 'dark' ? <FolderIconWhite /> : <FolderIconBlack />}
                    <Text textStyle="sm" className="mt-[2px]">
                      {project.value?.title}
                    </Text>
                  </Flex>
                  <ChevronRightIcon />
                </Box>
              ))}
            </Box>
          )}
          {selectedProject && (
            <Box className="flex flex-col gap-2 mt-6 h-[318px] overflow-y-auto">
              <button onClick={onPrev} className="flex items-center gap-2 mb-2">
                <ChevronLeftIcon /> {t('common:back')}
              </button>
              {selectedProject.value?.folders?.map((folder, index) => (
                <Box
                  key={index}
                  className={`flex items-center justify-between cursor-pointer rounded-lg p-2 ${
                    selectedFolder?.folderName === folder.name && selectedFolder.projectId === selectedProject.attributeId
                      ? 'bg-black/15'
                      : ''
                  }`}
                  onClick={() => handleSelectFolder(index, folder.name, selectedProject.attributeId as string)}
                >
                  <Flex gap={2} justifyContent="center" alignItems="center">
                    {colorMode === 'dark' ? <FolderIconWhite /> : <FolderIconBlack />}
                    <Text textStyle="sm" className="mt-[2px]">
                      {folder.name}
                    </Text>
                  </Flex>
                  <ChevronRightIcon />
                </Box>
              ))}
            </Box>
          )}
        </ModalBody>

        <ModalFooter display="flex" justifyContent="space-between" width="100%" gap={3}>
          <Button
            label={t('common:cancel')}
            extraClass="w-[50%] !bg-[transparent] !text-txtPrimary border border-borderPrimary dark:border-white dark:!text-white"
            onClick={onClose}
          />
          <Button
            label={t('common:move')}
            extraClass="w-[50%]"
            isDisabled={
              !moveImagesToFolderAction ||
              moveImagesToFolderAction.selectedImages.length === 0 ||
              (moveImagesToFolderAction.from.projectId === moveImagesToFolderAction.to.projectId &&
                moveImagesToFolderAction.from.folderIndex === moveImagesToFolderAction.to.folderIndex)
            }
            onClick={handleMoveImages}
          />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ModalMoveImages;



