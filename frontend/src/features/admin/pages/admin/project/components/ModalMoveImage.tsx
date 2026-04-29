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
import { MoveImageToFolderAction, SelectedMovingImageState } from '@/types/project';
import { useTranslation } from 'react-i18next';
import ModalCreateProject from './ModalCreateProject';
import ModalCreateFolder from './ModalCreateFolder';
import { CreateProjectParams } from '@/types';
import { UserProjectManagement } from '@/hooks/project';
import AddIconOutline from '@/shared/icons/AddIconOutline';

interface SelectedFolder {
  projectId: string;
  folderName: string;
  folderIndex: number;
}

interface ModalMoveImageProps {
  isOpen: boolean;
  editMode?: boolean;
  modelData?: SelectedMovingImageState | null;
  projects: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[];
  onClose: () => void;
  onMove?: (payload: MoveImageToFolderAction) => void;
  onCreateProject?: (createProjectParams: CreateProjectParams) => void | Promise<void>;
}

const ModalMoveImage: React.FC<ModalMoveImageProps> = ({ isOpen, onClose, modelData, projects, onMove, onCreateProject }) => {
  const { t } = useTranslation();
  const { colorMode } = useColorMode();
  const { createFolder, createProject } = UserProjectManagement();

  const [selectedProject, setSelectedProject] = useState<UserAttributeEntity<ProjectAttributeEntity, ActionEntity> | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<SelectedFolder | null>(null);
  const [moveImageToFolderAction, setMoveImageToFolderAction] = useState<MoveImageToFolderAction | null>(null);

  // Modal states
  const [openCreateProjectModal, setOpenCreateProjectModal] = useState(false);
  const [openCreateFolderModal, setOpenCreateFolderModal] = useState(false);

  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setSelectedProject(null);
      setSelectedFolder(null);
    }
  }, [isOpen]);

  // Update selectedProject when projects change (after folder creation)
  useEffect(() => {
    if (selectedProject) {
      const updatedProject = projects.find((p) => p.attributeId === selectedProject.attributeId);
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const handleMoveImage = () => {
    if (moveImageToFolderAction) {
      onMove?.(moveImageToFolderAction);
    }
    onClose();
  };

  const handleSelectProject = (projectId: string) => {
    const found = projects.find((project) => project.attributeId === projectId);

    if (found) {
      setSelectedProject(found);
    }
  };

  const handleSelectFolder = (folderIndex: number, folderName: string, attributeId: string) => {
    setSelectedFolder({
      projectId: attributeId,
      folderName: folderName,
      folderIndex: folderIndex,
    });

    if (!modelData) return;

    setMoveImageToFolderAction({
      from: {
        folderName: modelData?.folderName || '',
        projectId: modelData?.projectId || '',
        folderIndex: modelData?.folderIndex || 0,
      },
      to: {
        folderName: folderName,
        projectId: attributeId,
        folderIndex: folderIndex,
      },
      selectedImage: modelData,
    });
  };

  const handleCreateProject = async (createProjectParams: CreateProjectParams) => {
    // Close the create project modal
    setOpenCreateProjectModal(false);

    // Call parent handler if provided, otherwise use the hook's createProject
    if (onCreateProject) {
      await onCreateProject(createProjectParams);
    } else {
      const { projectName, projectDescription } = createProjectParams;
      await createProject(projectName, projectDescription);
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    if (!selectedProject?.attributeId) return;

    try {
      await createFolder(selectedProject.attributeId, folderName);

      setOpenCreateFolderModal(false);

      toast({
        title: t('common:folder'),
        description: t('notification:folder_created_successfully'),
        status: 'success',
        duration: 3000,
        position: 'bottom-right',
        isClosable: true,
      });
    } catch {
      toast({
        title: t('notification:error'),
        description: t('notification:failed_to_create_folder'),
        status: 'error',
        duration: 3000,
        position: 'bottom-right',
        isClosable: true,
      });
    }
  };

  const onPrev = () => {
    setSelectedProject(null);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent className="!rounded-xl">
          <ModalHeader className="flex flex-row justify-between items-start !pb-0">
            {t('common:move_image')}
            {selectedProject ? (
              <Button
                extraClass="!bg-[transparent] !text-primary dark:!text-white border border-primary dark:border-white max-h-[30px]"
                icon={<AddIconOutline />}
                label={t('common:create_folder')}
                iconPosition="before"
                onClick={() => setOpenCreateFolderModal(true)}
              />
            ) : (
              <Button
                extraClass="!bg-[transparent] !text-primary dark:!text-white border border-primary dark:border-white max-h-[30px]"
                icon={<AddIconOutline />}
                label={t('common:create_project')}
                iconPosition="before"
                onClick={() => setOpenCreateProjectModal(true)}
              />
            )}
          </ModalHeader>

          <ModalBody>
            <Stack direction="row">
              <Text textStyle="sm">{t('common:current_location')}:</Text>
              <Text fontWeight="bold">{modelData?.folderName}</Text>
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

                {selectedProject.value?.folders && selectedProject.value.folders.length > 0 ? (
                  selectedProject.value.folders.map((folder, index) => (
                    <Box
                      key={index}
                      className={`flex items-center justify-between cursor-pointer rounded-lg p-2 ${
                        (selectedFolder?.folderName === folder.name && selectedFolder.projectId === selectedProject.attributeId) ||
                        (modelData?.folderName === folder.name &&
                          modelData.projectId === selectedProject.attributeId &&
                          !selectedFolder)
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
                  ))
                ) : (
                  <Box className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Text className="text-gray-500 dark:text-gray-400 mb-2">{t('notification:no_folders_yet')}</Text>
                  </Box>
                )}
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
                !moveImageToFolderAction ||
                !selectedFolder ||
                (moveImageToFolderAction.from.projectId === moveImageToFolderAction.to.projectId &&
                  moveImageToFolderAction.from.folderIndex === moveImageToFolderAction.to.folderIndex)
              }
              onClick={handleMoveImage}
            />
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create Project Modal */}
      <ModalCreateProject
        isOpen={openCreateProjectModal}
        editMode={false}
        onClose={() => setOpenCreateProjectModal(false)}
        onCreate={handleCreateProject}
      />

      {/* Create Folder Modal */}
      <ModalCreateFolder
        isOpen={openCreateFolderModal}
        editMode={false}
        onClose={() => setOpenCreateFolderModal(false)}
        onCreate={handleCreateFolder}
      />
    </>
  );
};

export default ModalMoveImage;



