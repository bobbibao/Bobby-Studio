import ImageCard from '@/shared/card/ImageCard';
import { ActionEntity, Folder, ProjectAttributeEntity } from '@/common/dtos/attribute/common.dto';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import ThemedSelect from '@/components/ThemedSelect';
import { INSPIRATION_TABS, OPTIONS_SORTS } from '@/constants';
import MoveFolderIcon from '@/shared/icons/MoveFolderIcon';
import PencilSquare from '@/shared/icons/PencilSquare';
import TrashBinIcon from '@/shared/icons/TrashBinIcon';
import { Box, Flex, HStack, IconButton, Menu, MenuButton, MenuItem, MenuList, Text, Button as ChakraButton } from '@chakra-ui/react';
import AddIconThin from '@/shared/icons/AddIconThin';
import { orderBy } from 'lodash';
import { ChevronDownIcon, XIcon } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Empty from '@/components/Empty';
import { UserProjectManagement } from '@/hooks/project';
import Button from '@/shared/buttons/Button';
import CardFolder from '@/shared/card/CardFolder';
import { ImageData, OptionType } from '@/types';
import { ProjectFilters } from '@/types/project';
import { MoveImageToFolderAction, SelectedMovingImageState } from '@/types/project';
import ModalCreateFolder from './ModalCreateFolder';
import ModalCreateProject from './ModalCreateProject';
import ModalMoveImage from './ModalMoveImage';
import FilterModal from '../../inspiration/components/FilterDialog/FilterDialog';
import { FilterState } from '../../inspiration/types/filterDropdown';
import { useImageNavigation } from '@/hooks/useImageNavigation';
import useLayoutStore from '@/store/layoutStore';
import { useImagePreloader } from '@/hooks/useImagePreloader';
import { FilterButton } from '@/components/FilterButton';

interface GridChildProjectProps {
  projects: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[];
  data: Folder[];
  images?: ImageData[];
  parentProjectId: string;
  onFiltersChange?: (value: ProjectFilters) => void;
  onCreateFolder?: (id: string, value: string) => void;
  onFolderClick?: (attributeId?: string, value?: string) => void;
  onImportImage?: (img: ImageData) => void;
}

const GridChildProject: React.FC<GridChildProjectProps> = ({
  projects,
  data,
  images,
  onFiltersChange,
  onCreateFolder,
  parentProjectId,
  onFolderClick,
  onImportImage,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    deleteFolder,
    editFolder,
    moveImage,
    moveImages,
    deleteImage,
    deleteImages,
    editProjectTitleAndDescription,
    assignedAttributes,
  } = UserProjectManagement();

  const [formValue, setFormValue] = useState<ProjectFilters>({ date: '' });
  const [openModal, setOpenModal] = useState(false);
  const [folderData, setFolderData] = useState<any[]>([]);
  const [imageData, setImageData] = useState<any>([]);
  const [editFolderMode, setEditFolderMode] = useState<boolean>(false);
  const [openModalMoveImage, setOpenModalMoveImage] = useState(false);
  const [openModalMoveImages, setOpenModalMoveImages] = useState(false);
  const [currentFolderEdit, setCurrentFolderEdit] = useState<number | null>(null);
  const [isOpenEditProjectModal, setIsOpenEditProjectModal] = useState(false);
  const [currentProjectEdit, setCurrentProjectEdit] = useState<UserAttributeEntity<ProjectAttributeEntity, ActionEntity> | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedMovingImageState | null>(null);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);

  // Navigation state (initially empty, will be initialized after filteredImages is computed)
  const [navigationCurrentIndex, setNavigationCurrentIndex] = useState<number>(-1);

  const handleImageCardClick = (index: number) => {
    setNavigationCurrentIndex(index);
  };

  const translatorCommonNS = (key: string) => t(`common:${key}`);

  const convertArrayToObjectWithFlattenedStructure = (array: any = []) => {
    const result: { [key: string]: any } = {};

    array.forEach((item: any) => {
      if (item.attributeId) {
        const { value, ...basicInfo } = item;
        const newItem = { ...basicInfo };

        if (value) {
          const { folders, images, ...valueProps } = value;
          Object.assign(newItem, valueProps);

          // Only collect images from folders, not from main project images
          newItem.images = [];
          newItem.folders = [];

          if (folders && Array.isArray(folders)) {
            newItem.folders = folders.map((folder) => {
              const { images: folderImages, ...folderProps } = folder;
              return { ...folderProps, images: folderImages || [] };
            });

            folders.forEach((folder) => {
              if (folder.images && Array.isArray(folder.images)) {
                folder.images.forEach((image: any) => {
                  const imageWithFolderInfo = {
                    ...image,
                    folderName: folder.name,
                    folderType: folder.type,
                  };
                  newItem.images.push(imageWithFolderInfo);
                });
              }
            });
          }

          // Add main project images (those not in folders) separately
          if (images && Array.isArray(images)) {
            images.forEach((image: any) => {
              // Only add if not already in a folder
              const isInFolder = newItem.images.some(
                (folderImage: any) => (folderImage.id || folderImage.attributeId) === (image.id || image.attributeId)
              );
              if (!isInFolder) {
                newItem.images.push(image);
              }
            });
          }
        }

        result[item.attributeId] = newItem;
      }
    });

    return result;
  };

  useEffect(() => {
    const project = projects.find((element) => element.attributeId === parentProjectId) || null;
    setCurrentProjectEdit(project);

    const imagesObject = convertArrayToObjectWithFlattenedStructure(projects);
    const newImages: any[] = [];
    imagesObject?.[parentProjectId]?.images.forEach((el: any) => {
      const imageFind = assignedAttributes?.find((item: any) => {
        const imgId1 = item?.id || item?.attributeId;
        const imgId2 = el?.id || el?.attributeId;
        return imgId1 === imgId2;
      });
      let imageValue = { ...el };
      if (imageFind) {
        imageValue = { ...imageValue, ...imageFind };
      }
      newImages.push(imageValue);
    });

    setFolderData(imagesObject?.[parentProjectId]?.folders || []);
    setImageData(newImages);
  }, [projects, parentProjectId, assignedAttributes]);

  const handleCardFolderClick = (name: string) => {
    onFolderClick?.(parentProjectId, name);
  };

  const onClose = () => {
    setOpenModal(false);
    setOpenModalMoveImage(false);
    setOpenModalMoveImages(false);
    setEditFolderMode(false);
    setCurrentFolderEdit(null);
  };

  const handleCreateFolder = async (folderName: string) => {
    onCreateFolder?.(parentProjectId, folderName);
  };

  const openEditFolderModal = async (index: number) => {
    setEditFolderMode(true);
    setCurrentFolderEdit(index);
    setOpenModal(true);
  };

  const handleDeleteFolder = async (value: Folder, folderIndex: number) => {
    try {
      await deleteFolder(parentProjectId, folderIndex);
      setFolderData((prev) => prev?.filter((_, index) => index !== folderIndex));
    } catch (error) {}
  };

  const handleEditFolder = async (value: string) => {
    editFolder(parentProjectId, currentFolderEdit as number, { name: value });
  };

  const handleDeleteImage = async (folderName: string, imageId: string) => {
    try {
      await deleteImage(parentProjectId, folderName, imageId);
      setImageData((prev: any) =>
        prev?.filter((item: any) => {
          if (item.id) return item.id !== imageId;
          else if (item.attributeId) return item.attributeId !== imageId;
          return item;
        })
      );
    } catch (error) {}
  };

  const handleMoveImage = async (folderName: string, imageId: string, path: string, imageData: any) => {
    setSelectedImage({
      folderName,
      imageId,
      projectId: parentProjectId,
      folderIndex: data.findIndex((folder) => folder.name === folderName),
      imageIndex: data.find((folder) => folder.name === folderName)?.images.findIndex((img) => img.id === imageId) ?? -1,
      imagePath: path,
      imageData,
    });

    setOpenModalMoveImage(true);
  };

  const handleMoveImageToFolder = async (payload: MoveImageToFolderAction) => {
    try {
      await moveImage(payload);
      // Remove the moved image from the current display
      setImageData((prev: any) =>
        prev?.filter((item: any) => {
          const imageId = item.id || item.attributeId;
          const movedImageId = payload.selectedImage.imageData.attributeId || payload.selectedImage.imageData.id;
          return imageId !== movedImageId;
        })
      );
    } catch (error) {}
  };

  const openEditProjectModal = () => {
    setIsOpenEditProjectModal(true);
  };

  const onCloseEditProjectModal = () => {
    setIsOpenEditProjectModal(false);
  };

  const handleEditProject = async (projectName: string, projectDescription: string) => {
    const projectId = currentProjectEdit?.attributeId || '';
    editProjectTitleAndDescription(projectId, projectName, projectDescription);
  };

  const getTitleProject = () => {
    const arrs = projects.filter((item) => item.attributeId === parentProjectId);
    if (arrs.length > 0) {
      return arrs[0].value?.title;
    }
    return '';
  };

  const handleSelectImages = (img: any) => {
    setSelectedImages((prevSelected) => {
      const imgId = img.id || img.attributeId;
      const exists = prevSelected.some((item) => (item.id || item.attributeId) === imgId);
      let newSelected;
      if (exists) {
        newSelected = prevSelected.filter((item) => (item.id || item.attributeId) !== imgId);
      } else {
        newSelected = [...prevSelected, img];
      }
      return newSelected;
    });
  };

  const handleDeleteImages = async () => {
    if (selectedImages.length === 0) return;
    try {
      // Prepare array of { folderName, imageId } for deleteImages
      const imagesToDelete = selectedImages.map((img) => ({
        folderName: img.folderName || '',
        imageId: img.id || img.attributeId,
      }));
      await deleteImages(parentProjectId, imagesToDelete);
      setImageData((prev: any[]) =>
        prev?.filter((item: any) => !selectedImages.some((sel) => (sel.id || sel.attributeId) === (item.id || item.attributeId)))
      );
      setSelectedImages([]);
    } catch (error) {
      console.error('Failed to delete images:', error);
    }
  };

  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  const filterRef = useRef<HTMLDivElement>(null);

  const handleFilterOpen = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleFilterClose = () => {
    setIsFilterOpen(false);
  };

  const handleApplyFilter = (filters: FilterState) => {
    setSelectedFilters(filters);

    const orderBy = filters.time === 'newest' ? 'desc' : 'asc';
    const inputType = Array.isArray(filters.models) && filters.models.length > 0 ? filters.models : [];

    setFormValue((prev) => ({
      ...prev,
      mode: inputType,
      date: orderBy,
      type: filters.type,
    }));

    setIsFilterOpen(false);
  };

  const [selectedFilters, setSelectedFilters] = useState<FilterState>({
    models: [],
    type: '',
    time: '',
  });

  const filteredImages = useMemo(() => {
    let newList = [...imageData];

    if (formValue.date) {
      newList = orderBy(newList, 'createdAt', formValue.date as 'asc' | 'desc');
    }

    if (formValue && Array.isArray(formValue.mode) && formValue.mode.length > 0) {
      newList = newList?.filter((el) => {
        const inputType = el?.actions?.generateImageParams?.data?.inputType || '';
        return (formValue.mode ?? []).includes(inputType);
      });
    }

    if (formValue.type) {
      newList = newList?.filter((el) => {
        const creationType = el?.actions?.generateImageParams?.data?.creationType || '';
        return creationType === formValue.type;
      });
    }
    return newList || [];
  }, [imageData, formValue.date, formValue.mode, formValue.type]);

  // Navigation hook using filteredImages
  const { currentIndex, handleNext, handlePrev } = useImageNavigation({
    totalImages: filteredImages?.length || 0,
    initialIndex: navigationCurrentIndex,
    onIndexChange: (newIndex) => {
      setNavigationCurrentIndex(newIndex);
    },
  });

  const handleModalClose = () => {
    setNavigationCurrentIndex(-1);
  };

  const { columns } = useLayoutStore();

  // Use the image preloader hook to load all images in parallel
  const { getImage, isPreloading } = useImagePreloader(
    filteredImages.map((img: any) => ({
      key: img.value?.key || img.value,
      thumbnail: img.value?.thumbnail || true,
      format: 'webp',
      path: img.value?.path,
      thumbnailUrl: img.value?.thumbnail,
    })),
    'webp'
  );

  return (
    <Flex direction="column" w="full" id="GridChildProject">
      <Flex align="center" justify="space-between" w="full" gap={4} mb={4}>
        <HStack spacing={2}>
          <Text
            fontSize="xl"
            fontWeight="bold"
            noOfLines={1}
            title={getTitleProject()} // Show full title on hover
            flex="1"
            color="text.primary"
          >
            {getTitleProject()}
          </Text>
          <IconButton
            aria-label={translatorCommonNS('edit_project')}
            icon={<PencilSquare />}
            variant="ghost"
            size="sm"
            onClick={() => openEditProjectModal()}
          />
        </HStack>
        <HStack spacing={2}>
          <Box position="relative" ref={filterRef}>
            <FilterButton
              label={translatorCommonNS('filter')}
              onClick={handleFilterOpen}
              isActive={isFilterOpen}
              justifyContent="space-between"
              rightIcon={
                <Box as="span" display="inline-flex">
                  <ChevronDownIcon size={16} />
                </Box>
              }
            />
            {isFilterOpen && (
              <Box position="absolute" top="100%" right={0} zIndex={50} mt={2}>
                <FilterModal onApplyFilter={handleApplyFilter} onCancel={handleFilterClose} initialFilters={selectedFilters} />
              </Box>
            )}
          </Box>
          <ChakraButton variant="secondary" leftIcon={<AddIconThin />} onClick={() => setOpenModal(true)} size="sm">
            {translatorCommonNS('create_folder')}
          </ChakraButton>
        </HStack>
      </Flex>

      {!!folderData?.length || !!imageData?.length ? (
        <Box maxH="calc(100vh - 200px)" overflowY="auto">
          {!!folderData?.length && (
            <Flex wrap="wrap" gap={2} mb={4}>
              {folderData.map((item, index) => (
                <CardFolder
                  // id={item.id as string}
                  key={item.id}
                  name={item.name}
                  updatedAt={''}
                  onClick={() => handleCardFolderClick(item.name)}
                  onEdit={() => openEditFolderModal(index)}
                  onDelete={(name: string) => handleDeleteFolder(item, index)}
                />
              ))}
            </Flex>
          )}
          {!!filteredImages?.length && (
            <Box pt={0} pb={0}>
              <Box className={`layout-columns-${columns}`}>
                {filteredImages?.map((img: any, index: number) => {
                  const imgId = img.id || img.attributeId;
                  const isSelected = selectedImages.some((item) => (item.id || item.attributeId) === imgId);
                  const imageKey = img.value?.key || img.value;
                  const preloadedImage = getImage(imageKey);
                  return (
                    <ImageCard
                      key={imgId}
                      id={imgId}
                      img={{
                        id: imgId,
                        path: img?.path || img.value?.path || '',
                        folderName: img?.folderName || '',
                        thumbnail: img?.thumbnail || img.value?.thumbnail || '',
                        dimensions: img?.dimensions || img.value?.dimensions || '',
                        preloadedBlobUrl: preloadedImage.blobUrl,
                      }}
                      isFavorite={img?.isFavorite || false}
                      isBookmarked={img?.isBookmarked || false}
                      matchedAttribute={img}
                      isSelected={isSelected}
                      onSelect={() => {
                        handleSelectImages(img);
                      }}
                      handleOnClick={() => handleImageCardClick(index)}
                      onModalClose={handleModalClose}
                      // Navigation props
                      allImages={filteredImages?.map((item: any) => ({
                        id: item.id || item.attributeId,
                        path: item?.path || item.value?.path || '',
                        folderName: item?.folderName || '',
                        thumbnail: item?.thumbnail || item.value?.thumbnail || '',
                        dimensions: item?.dimensions || item.value?.dimensions || '',
                      }))}
                      currentImageIndex={navigationCurrentIndex === index ? currentIndex : undefined}
                      onNavigationPrevious={handlePrev}
                      onNavigationNext={handleNext}
                      hasAction={true}
                      handleDelCallback={() => handleDeleteImage(img?.folderName || '', imgId)}
                      onMoveToProject={() => handleMoveImage(img?.folderName || '', imgId, img?.path || img.value?.path || '', img)}
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      ) : (
        <Flex direction="column" align="center" justify="center" h="calc(100vh - 142px)">
          <Empty
            emptyText={t('notification:no_image_yet')}
            emptyDesc={t('notification:get_started_by_creating_your_first_project_to_begin_managing_your_work_efficiently')}
          />
        </Flex>
      )}

      {selectedImages.length > 0 && (
        <Box
          position="fixed"
          bottom={6}
          left="50%"
          transform="translateX(-10%)"
          bg="bg.surface"
          rounded="lg"
          borderWidth="1px"
          borderColor="border.default"
          shadow="lg"
          display="flex"
          alignItems="center"
          px={6}
          py={3}
          zIndex={100}
          minW="600px"
          justify="space-between"
        >
          <HStack spacing={3}>
            <Box bg="brand.600" color="white" px={2} py={1} rounded="sm" fontWeight="medium" fontSize="sm" lineHeight="1">
              {selectedImages.length}
            </Box>
            <Text fontSize="base" fontWeight="normal" color="text.primary">
              selected
            </Text>
          </HStack>
          <HStack spacing={2}>
            <ChakraButton variant="primary" leftIcon={<MoveFolderIcon />} onClick={() => setOpenModalMoveImages(true)} size="sm">
              Move
            </ChakraButton>
            <ChakraButton variant="secondary" leftIcon={<TrashBinIcon />} onClick={handleDeleteImages} size="sm">
              Delete
            </ChakraButton>
            <IconButton
              aria-label="Clear selection"
              icon={<XIcon fontSize={20} />}
              variant="ghost"
              color="text.muted"
              _hover={{ bg: 'bg.subtle', color: 'text.primary' }}
              rounded="full"
              onClick={() => setSelectedImages([])}
            />
          </HStack>
        </Box>
      )}
      {/* <ModalMoveImages
        projects={projects}
        isOpen={openModalMoveImages}
        onClose={onClose}
        onMove={handleMoveImagesToFolder}
        selectedImages={selectedImages}
      /> */}
      <ModalCreateFolder
        editMode={editFolderMode}
        modelData={folderData[currentFolderEdit as number]}
        isOpen={openModal}
        onClose={onClose}
        onEdit={handleEditFolder}
        onCreate={handleCreateFolder}
      />
      <ModalMoveImage
        projects={projects}
        isOpen={openModalMoveImage}
        onClose={onClose}
        onMove={handleMoveImageToFolder}
        modelData={selectedImage}
      />
      <ModalCreateProject
        modelData={currentProjectEdit}
        editMode={true}
        isOpen={isOpenEditProjectModal}
        onClose={onCloseEditProjectModal}
        onEdit={handleEditProject}
      />
    </Flex>
  );
};

export default GridChildProject;



