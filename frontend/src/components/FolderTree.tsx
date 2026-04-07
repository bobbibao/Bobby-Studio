import { Accordion, AccordionButton, AccordionItem, AccordionPanel, Box, Flex, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { PROJECT_TREE_ITEM } from '../constants';
import ChevronDownIconBlack from '@/shared/icons/ChevronDownIconBlack';
import ChevronDownIconWhite from '@/shared/icons/ChevronDownIconWhite';
import ChevronUpIconBlack from '@/shared/icons/ChevronUpIconBlack';
import ChevronUpIconWhite, { ChevronUpIcon } from '@/shared/icons/ChevronUpIconWhite';
import FolderIconWhite, { FolderIcon } from '@/shared/icons/FolderIconWhite';
import FolderIconBlack from '@/shared/icons/FolderIconBlack';
import UploadIcon from '@/shared/icons/UploadIcon';
import ImageIcon from '@/shared/icons/ImageIcon';
import { ImageData } from '@/types';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import { ProjectAttributeEntity, Folder, ActionEntity } from '@/common/dtos/attribute/common.dto';
import HandIcon from '@/shared/icons/HandIcon';
import { useColorMode } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface FolderTreeProps {
  projects: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[];
  onTreeItemClick: (clickType: string, id?: string, value?: string) => void;
  onDropImage: (projectId: string, folderName: string, img: ImageData) => void;
  activeItem: string | null;
  setActiveItem: (item: string | null) => void;
  activeFolderId?: string | null;
  setActiveFolderId: (id: string | null) => void;
  activeChildFolder?: string | null;
  setActiveChildFolder: (id: string | null) => void;
  activeChildProject?: string | null;
  setActiveChildProject: (id: string | null) => void;
  expanded?: boolean;
}

const FolderTree: React.FC<FolderTreeProps> = ({
  projects,
  onTreeItemClick,
  onDropImage,
  activeItem,
  setActiveItem,
  activeFolderId,
  setActiveFolderId,
  activeChildFolder,
  setActiveChildFolder,
  activeChildProject,
  setActiveChildProject,
  expanded,
}: FolderTreeProps) => {
  const { t } = useTranslation();
  const { colorMode } = useColorMode();

  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleTreeItemClick = (clickType: string, projectId?: string, itemName?: string) => {
    setActiveItem(projectId as string);
    onTreeItemClick(clickType, projectId, itemName);
    setActiveFolderId(null);
    setActiveChildFolder(null);
    if (projectId !== 'Unassigned' && projectId !== 'Uploads' && projectId !== 'All project') {
      setActiveChildProject(projectId as string);
    } else setActiveChildProject(null);
  };

  const handleFolderClick = (projectId: string, itemName: string) => {
    setActiveItem(null);
    // Create a unique identifier combining project ID and folder name
    setActiveFolderId(`${projectId}-${itemName}`);
    setActiveChildFolder(projectId);
    onTreeItemClick(PROJECT_TREE_ITEM.FOLDER, projectId, itemName);
  };

  const [{ isOver }, drop] = useDrop({
    accept: 'IMAGE',
    drop: (item: ImageData, monitor) => {
      if (!monitor.didDrop()) {
        const clientOffset = monitor.getClientOffset();
        if (clientOffset) {
          setTooltipPosition({ x: clientOffset.x, y: clientOffset.y });
          setTimeout(() => setTooltipPosition(null), 1000);
        }
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  return (
    <Flex
      id="FolderTree"
      direction="column"
      h={`calc(100% - 48px)`}
      w="200px"
      position="relative"
      overflowY="auto"
      m={4}
      flexShrink={0}
      flexDirection="column"
    >
      {tooltipPosition && (
        <Box
          position="absolute"
          left={tooltipPosition.x}
          top={tooltipPosition.y}
          transform="translate(-50%, -50%)"
          rounded="xl"
          zIndex={10}
          flexGrow={1}
          w="full"
          p={4}
          bg="bg.surface"
          shadow="lg"
        >
          <Flex align="center" gap={4}>
            <ImageIcon /> <Text fontSize="sm">Furnish Empty Space</Text>
          </Flex>
        </Box>
      )}
      <Box
        ref={drop}
        position="relative"
        height="100%"
        display="flex"
        flexDirection="column"
        borderTopLeftRadius="lg"
        w="200px"
        minH="calc(100% - 56px)"
      >
        <Accordion allowMultiple flex="1 0 auto" display="flex" flexDirection="column" flexGrow="inherit" id="accorions">
          <AccordionItem flex={1} display="flex" flexDirection="column" border="none">
            {({ isExpanded }) => (
              <>
                <Box>
                  <AccordionButton
                    rounded="lg"
                    p={0}
                    bg={activeChildProject ? 'bg.subtle' : 'transparent'}
                    _hover={{ bg: 'bg.subtle' }}
                    onClick={() => handleTreeItemClick(PROJECT_TREE_ITEM.ALL_PROJECT, PROJECT_TREE_ITEM.ALL_PROJECT)}
                  >
                    <Text
                      flex={1}
                      textAlign="left"
                      py={2}
                      px={3}
                      fontSize="sm"
                      bg={activeItem === PROJECT_TREE_ITEM.ALL_PROJECT ? (colorMode === 'dark' ? 'white' : 'zinc.900') : 'transparent'}
                      color={activeItem === PROJECT_TREE_ITEM.ALL_PROJECT ? (colorMode === 'dark' ? 'zinc.900' : 'white') : 'text.primary'}
                      borderRadius="lg"
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box as="span" display="flex" alignItems="center" gap={2}>
                        <Box flexShrink={0} w="16px" h="16px" display="flex" alignItems="center" justifyContent="center">
                        {activeItem === PROJECT_TREE_ITEM.ALL_PROJECT ? (
                          colorMode === 'dark' ? <FolderIconBlack /> : <FolderIcon />
                        ) : colorMode === 'dark' ? (
                          <FolderIconWhite />
                        ) : (
                        <FolderIcon />
                        )}
                        </Box>
                        <Text as="span" fontSize="sm">{t('common:project')}</Text>
                      </Box>
                      {!!projects?.length && (
                        <Box
                          flexShrink={0}
                          w="16px"
                          h="16px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          transform={isExpanded ? 'rotate(0deg)' : 'rotate(180deg)'}
                          transition="transform 0.2s"
                        >
                          <ChevronUpIcon />
                        </Box>
                      )}
                    </Text>
                  </AccordionButton>
                </Box>

                <AccordionPanel p={0} flex={1} overflowY="auto" display="flex" flexDirection="column">
                  <VStack spacing={0} align="stretch" flex={1}>
                    {projects.map((project, index) => (
                      <React.Fragment key={project.attributeId || index}>
                        <Accordion allowMultiple key={project.attributeId || index} mt={1}>
                          <AccordionItem border="none">
                            {({ isExpanded }) => (
                              <>
                                <AccordionButton
                                  pl={5}
                                  py={2}
                                  pr={3}
                                  w="full"
                                  rounded="lg"
                                  bg={
                                    activeItem === project.attributeId
                                      ? colorMode === 'dark' ? 'white' : 'zinc.900'
                                      : activeChildFolder === project.attributeId
                                      ? 'bg.subtle'
                                      : 'transparent'
                                  }
                                  _hover={{ bg: 'bg.subtle' }}
                                  id={project.attributeId}
                                  onClick={() => {
                                    handleTreeItemClick(PROJECT_TREE_ITEM.CHILD_PROJECT, project.attributeId || '');
                                  }}
                                >
                                  <Flex
                                    flex={1}
                                    align="center"
                                    justify="space-between"
                                    gap={2}
                                  >
                                    <Flex align="center" gap={2} flex={1} minW={0}>
                                      <Box flexShrink={0} w="16px" h="16px" display="flex" alignItems="center" justifyContent="center">
                                      {activeItem === project.attributeId ? (
                                        colorMode === 'dark' ? (
                                          <FolderIconBlack />
                                        ) : (
                                          <FolderIconWhite />
                                        )
                                      ) : colorMode === 'dark' ? (
                                        <FolderIconWhite />
                                      ) : (
                                        <FolderIconBlack />
                                      )}
                                      </Box>
                                      <Text
                                        maxW="96px"
                                        overflow="hidden"
                                        textOverflow="ellipsis"
                                        whiteSpace="nowrap"
                                        title={project.value?.title}
                                        fontSize="sm"
                                        color={activeItem === project.attributeId ? (colorMode === 'dark' ? 'zinc.900' : 'white') : 'text.primary'}
                                        minW={0}
                                      >
                                        {project.value?.title}
                                      </Text>
                                    </Flex>
                                    <Box flexShrink={0} w="16px" h="16px" display="flex" alignItems="center" justifyContent="center">
                                    {isExpanded ? (
                                      activeItem === project.attributeId ? (
                                        colorMode === 'dark' ? (
                                          <ChevronUpIconBlack />
                                        ) : (
                                          <ChevronUpIconWhite />
                                        )
                                      ) : colorMode === 'dark' ? (
                                        <ChevronUpIconWhite />
                                      ) : (
                                        <ChevronUpIconBlack />
                                      )
                                    ) : activeItem === project.attributeId ? (
                                      colorMode === 'dark' ? (
                                        <ChevronDownIconBlack />
                                      ) : (
                                        <ChevronDownIconWhite />
                                      )
                                    ) : colorMode === 'dark' ? (
                                      <ChevronDownIconWhite />
                                    ) : (
                                      <ChevronDownIconBlack />
                                    )}
                                    </Box>
                                  </Flex>
                                </AccordionButton>

                                <AccordionPanel pb={0} pl={0} pr={0} pt={project.value?.folders?.length ? 1 : 0}>
                                  <VStack spacing={3} align="stretch">
                                    {project.value?.folders?.map((folder: Folder) => (
                                      <DroppableFolder
                                        key={`${project.attributeId}-${folder.name}`}
                                        project={project.attributeId || ''}
                                        folder={folder}
                                        onDropImage={onDropImage}
                                        onClick={() => handleFolderClick(project.attributeId || '', folder.name)}
                                        isActive={activeFolderId === `${project.attributeId}-${folder.name}`}
                                      />
                                    ))}
                                  </VStack>
                                </AccordionPanel>
                              </>
                            )}
                          </AccordionItem>
                        </Accordion>
                        {index !== projects.length - 1 && (
                          <Box
                            borderTop="1px solid"
                            borderColor="border.default"
                            mx={0}
                            mb={0}
                            mt={1}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </VStack>
                </AccordionPanel>
                {isExpanded && (
                  <Box borderTop="1px solid" borderColor="border.default" mx={0} mt={1} mb={0} />
                )}
              </>
            )}
          </AccordionItem>

          <AccordionItem border="none" mt={1}>
            <AccordionButton
              rounded="lg"
              p={0}
              bg="transparent"
              _hover={{ bg: 'bg.subtle' }}
              onClick={() => handleTreeItemClick(PROJECT_TREE_ITEM.UNASSIGNED, PROJECT_TREE_ITEM.UNASSIGNED)}
            >
              <Text
                flex={1}
                py={2}
                px={3}
                fontSize="sm"
                bg={activeItem === 'Unassigned' ? (colorMode === 'dark' ? 'white' : 'zinc.900') : 'transparent'}
                color={activeItem === 'Unassigned' ? (colorMode === 'dark' ? 'zinc.900' : 'white') : 'text.primary'}
                borderRadius="lg"
                display="flex"
                alignItems="center"
                gap={2}
              >
                <Box flexShrink={0} display="flex" alignItems="center" justifyContent="center" w="16px" h="16px">
                  <ImageIcon />
                </Box>
                <Text as="span" fontSize="sm">{t('common:unassigned')}</Text>
              </Text>
            </AccordionButton>
          </AccordionItem>

          <Box borderTop="1px solid" borderColor="border.default" mx={0} mt={1} mb={1} />

          <AccordionItem border="none">
            <AccordionButton
              rounded="lg"
              p={0}
              bg="transparent"
              _hover={{ bg: 'bg.subtle' }}
              onClick={() => handleTreeItemClick(PROJECT_TREE_ITEM.UPLOADS, PROJECT_TREE_ITEM.UPLOADS)}
            >
              <Text
                flex={1}
                py={2}
                px={3}
                fontSize="sm"
                bg={activeItem === 'Uploads' ? (colorMode === 'dark' ? 'white' : 'zinc.900') : 'transparent'}
                color={activeItem === 'Uploads' ? (colorMode === 'dark' ? 'zinc.900' : 'white') : 'text.primary'}
                borderRadius="lg"
                display="flex"
                alignItems="center"
                gap={2}
              >
                <Box flexShrink={0} w="16px" h="16px" display="flex" alignItems="center" justifyContent="center">
                <UploadIcon
                  modeOverride={
                    colorMode === 'dark'
                      ? activeItem === 'Uploads'
                        ? 'light'
                        : 'dark'
                      : 'light'
                  }
                />
                </Box>
                <Text as="span" fontSize="sm">{t('common:uploads')}</Text>
              </Text>
            </AccordionButton>
          </AccordionItem>
        </Accordion>
      </Box>
    </Flex>
  );
};

const DroppableFolder: React.FC<{
  project: string;
  folder: Folder;
  onDropImage: (projectId: string, folderName: string, img: ImageData) => void;
  onClick: (clickType: string, folderName: string) => void;
  isActive: boolean;
}> = ({ project, folder, onDropImage, onClick, isActive }) => {
  const { colorMode } = useColorMode();
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'IMAGE',
      drop: (item: ImageData) => {
        if (folder.name === item.folderName) {
          return false;
        } else {
          onDropImage(project, folder.name, item);
        }
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [onDropImage, project, folder]
  );
  const hoverBg = useColorModeValue('bg.subtle', 'bg.subtle');
  const overBg = useColorModeValue('bg.subtle', 'bg.muted');
  const activeBgLight = 'brand.600';
  const activeBgDark = 'white';

  return (
    <Box
      ref={drop}
      bg={
        isActive
          ? colorMode === 'dark'
            ? activeBgDark
            : activeBgLight
          : isOver
          ? overBg
          : 'transparent'
      }
      border={isOver ? '2px dashed' : 'none'}
      borderColor={isOver ? 'brand.600' : 'transparent'}
      rounded="lg"
      cursor="pointer"
      _hover={{
        bg: isActive
          ? colorMode === 'dark'
            ? activeBgDark
            : activeBgLight
          : hoverBg
      }}
      onClick={() => onClick(PROJECT_TREE_ITEM.FOLDER, folder.name || '')}
    >
      {isOver && (
        <Box position="absolute" top="50%" left="-5" transform="translateY(-50%)">
          <HandIcon active={false} />
        </Box>
      )}
      <Flex
        align="center"
        gap={2}
        pl={8}
        py={2}
        pr={3}
        rounded="lg"
        color={isActive ? (colorMode === 'dark' ? 'zinc.900' : 'white') : 'text.primary'}
      >
        <Box flexShrink={0} w="16px" h="16px" display="flex" alignItems="center" justifyContent="center">
          {isActive
            ? colorMode === 'dark'
              ? <FolderIconBlack />
              : <FolderIconWhite />
            : colorMode === 'dark'
            ? <FolderIconWhite />
            : <FolderIconBlack />}
        </Box>
        <Text
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          maxW="125px"
          fontSize="sm"
          title={folder.name}
        >
          {folder.name}
      </Text>
      </Flex>
    </Box>
  );
};

export default FolderTree;

