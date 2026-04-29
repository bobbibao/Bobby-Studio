import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionEntity,
  Folder,
  GeneratedImageAttributeEntity,
  OriginalImageAttributeEntity,
  ProjectAttributeEntity,
} from '@/common/dtos/attribute/common.dto';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import MoveFolderIcon from '@/shared/icons/MoveFolderIcon';
import TrashBinIcon from '@/shared/icons/TrashBinIcon';
import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  useToast,
  Button as ChakraButton,
} from '@chakra-ui/react';
import AddIconThin from '@/shared/icons/AddIconThin';
import { ChevronRightIcon, XIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Empty from '@/components/Empty';
import LoadingPage from '@/components/LoadingPage';
import Button from '@/shared/buttons/Button';
import { ProjectFilters } from '@/types/project';
import ImageItem from './ImageItem';
import ModalMoveImage from './ModalMoveImage';
import { MoveImagesToFolderAction, MoveImageToFolderAction } from '@/types/project';
import { UserProjectManagement } from '@/hooks/project';
import { SelectedMovingImageState } from '@/types/project';
import { GenerateInputTypeEnum, GenerateInputTypeToTextMap } from '@/constants/attribute-enum';
import { orderBy, set } from 'lodash';
import { useTranslation } from 'react-i18next';
import { FilterState } from '../../inspiration/types/filterDropdown';
import { ChevronDownIcon } from 'lucide-react';
import FilterModal from '../../inspiration/components/FilterDialog/FilterDialog';
import ModalMoveImages from './ModalMoveImages';
import { BreadcrumbItemType } from '@/types/breadcrumb';
import useLayoutStore from '@/store/layoutStore';
import Pagination from '@/components/Pagination';
import { useImageNavigation } from '@/hooks/useImageNavigation';
import { FilterButton } from '@/components/FilterButton';
import { GridSwitcher } from '@/components/GridSwitcher';

interface GridFolderItemsProps {
  projects: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[];
  folder: Folder;
  data?: UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>[];
  parentProjectId: string;
  isUnassigned: boolean;
  folderPath?: BreadcrumbItemType[];
  handleBreadcrumbClick: (idx: number) => void;
  pagination?: any;
  onPageChange?: (page: number) => void;
  onFilterChange?: (filters: { orderBy?: 'asc' | 'desc'; inputType?: string[]; creationType?: string }) => void;
  isLoading?: boolean; // Loading state for unassigned images
  onImportImage?: (img: ImageData) => void;
}

const GridFolderItems: React.FC<GridFolderItemsProps> = ({
  projects: projectsProps,
  folder,
  parentProjectId,
  isUnassigned,
  folderPath,
  handleBreadcrumbClick,
  pagination,
  onPageChange,
  onFilterChange,
  isLoading = false,
  onImportImage,
}) => {
  const { t } = useTranslation();

  const [formValue, setFormValue] = useState<ProjectFilters>({
    models: [],
    date: '',
    type: '',
  });
  const [openModalMoveImage, setOpenModalMoveImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedMovingImageState | null>(null);
  const navigate = useNavigate();
  const { projects, moveImages, moveImage, deleteImage, deleteImages, deactiveImage, filterArrayByIds } = UserProjectManagement();
  const [imagesData, setImagesData] = useState<any[]>([]);
  // const [deletedImageIds, setDeletedImageIds] = useState<Set<string>>(new Set());
  const [deletedImagesByFolder, setDeletedImagesByFolder] = useState<Record<string, Set<string>>>({});

  const toast = useToast();
  const [openModalMoveImages, setOpenModalMoveImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedMovingImageState[]>([]);
  const { columns, setColumns } = useLayoutStore();

  // Navigation state (will be initialized after filteredImages)
  const [navigationCurrentIndex, setNavigationCurrentIndex] = useState<number>(-1);

  const translatorCommonNS = (key: string) => t(`common:${key}`);

  const handleColChange = (value: number) => {
    setColumns(value);
  };

  useEffect(() => {
    let images: any = [];
    if (isUnassigned) {
      images = folder?.images || [];
    } else {
      const folderImages = folder?.images || [];
      const newImages = filterArrayByIds(folderImages);
      if (newImages?.length < folderImages?.length) {
        const imagesTemp: any[] = [];
        folderImages.forEach((el: any) => {
          const imgFind = newImages?.find((item: any) => {
            const imgId1 = item?.id || item?.attributeId;
            const imgId2 = el?.id || el?.attributeId;
            return imgId1 === imgId2;
          });
          if (!imgFind) imagesTemp.push(el);
        });
        images = [...newImages, ...imagesTemp];
      } else {
        images = newImages;
      }
    }

    // Filter out deleted images
    const filteredImages = (images || []).filter((img: any) => {
      const imageId = img.id || img.attributeId;
      return !deletedImagesByFolder[folder.name]?.has(imageId);
    });

    setImagesData(filteredImages);
  }, [folder, deletedImagesByFolder]);

  const filteredImages = useMemo(() => {
    let newList = [...imagesData];

    if (isUnassigned) {
      return newList || [];
    }

    if (formValue.date) {
      newList = orderBy(newList, 'createdAt', formValue.date as 'asc' | 'desc');
    }

    if (formValue && Array.isArray(formValue.models) && formValue.models.length > 0) {
      newList = newList?.filter((el) => {
        const inputType = el?.actions?.generateImageParams?.data?.inputType || '';
        return (formValue.models ?? []).includes(inputType);
      });
    }

    if (formValue.type) {
      newList = newList?.filter((el) => {
        const creationType = el?.actions?.generateImageParams?.data?.creationType || '';
        return creationType === formValue.type;
      });
    }

    return newList || [];
  }, [imagesData, formValue.date, formValue.models, formValue.type, isUnassigned]);

  // Navigation hooks - must be after filteredImages is defined
  const { currentIndex, handleNext, handlePrev } = useImageNavigation({
    totalImages: filteredImages.length,
    initialIndex: navigationCurrentIndex,
    onIndexChange: (newIndex) => {
      setNavigationCurrentIndex(newIndex);
    },
  });

  const handleImageCardClick = (index: number) => {
    setNavigationCurrentIndex(index);
  };

  const handleModalClose = () => {
    setNavigationCurrentIndex(-1);
  };

  const handleDeleteImage = async (folderName: string, imageId: string) => {
    try {
      if (isUnassigned) {
        const result = await deactiveImage(imageId);
        if (!result) {
          return;
        }
      } else {
        await deleteImage(parentProjectId, folderName, imageId);
      }

      // Add to deleted images set
      setDeletedImagesByFolder((prev) => ({
        ...prev,
        [folderName]: new Set([...(prev[folderName] ? Array.from(prev[folderName]) : []), imageId]),
      }));

      // Update local state
      setImagesData((prev) =>
        prev?.filter((item) => {
          if (item.id) return item.id !== imageId;
          else if (item.attributeId) return item.attributeId !== imageId;
          return item;
        })
      );
    } catch (error) {
      toast({
        title: t('notification:error'),
        description: t('notification:failed_to_delete_image'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleMoveImage = async (folderName: string, imageId: string, path: string, imageData: any) => {
    const project: any = projects.find((p) => p.attributeId === parentProjectId);
    const folderIndex = project && project?.value?.folders.findIndex((folder: any) => folder.name === folderName);
    const imageIndex = project?.value?.folders[folderIndex]?.images.findIndex((img: any) => img.id === imageId);
    setSelectedImage({
      folderName,
      imageId,
      projectId: parentProjectId,
      folderIndex: folderIndex ?? -1,
      imageIndex: imageIndex ?? -1,
      imagePath: path,
      imageData,
    });
    setOpenModalMoveImage(true);
  };

  const handleMoveImageToFolder = async (payload: MoveImageToFolderAction) => {
    try {
      await moveImage(payload, isUnassigned);

      const imageId = payload.selectedImage.imageData.attributeId;
      // Add to deleted images set for this folder
      setDeletedImagesByFolder((prev) => ({
        ...prev,
        [payload.from.folderName]: new Set([
          ...(prev[payload.from.folderName] ? Array.from(prev[payload.from.folderName]) : []),
          imageId,
        ]),
      }));

      setImagesData((prev: any[]) =>
        prev?.filter((item) => {
          if (item.id) return item.id !== imageId;
          else if (item.attributeId) return item.attributeId !== imageId;
          return item;
        })
      );
    } catch (error) {
      console.log('Error when moving image: ', error);
    }
  };

  const handleGenerateClick = (type: string) => {
    navigate(`/generate?projectId=${parentProjectId}&folderName=${encodeURIComponent(folder.name)}`);
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

    const orderBy = filters.time === 'oldest' ? 'asc' : 'desc';
    const inputType = (filters?.models ?? []).length > 0 ? filters.models ?? [] : [];

    setFormValue((prev) => ({
      ...prev,
      models: inputType,
      date: orderBy,
      type: filters.type,
    }));

    setIsFilterOpen(false);

    // For unassigned images, trigger API call with filters
    if (isUnassigned && onFilterChange) {
      onFilterChange({
        orderBy: orderBy,
        inputType: inputType,
        creationType: filters.type || '',
      });
    }
  };

  const [selectedFilters, setSelectedFilters] = useState<FilterState>({
    models: [],
    type: '',
    time: '',
  });

  const handleSelectImages = (img: any) => {
    const imgId = img.id || img.attributeId;

    const project: any = projects.find((p) => p.attributeId === parentProjectId);
    const folderIndex = project && project?.value?.folders.findIndex((_folder: any) => _folder.name === folder?.name);
    const imageIndex = project?.value?.folders[folderIndex]?.images.findIndex((_img: any) => _img.attributeId === imgId);

    setSelectedImages((prevSelected) => {
      const exists = prevSelected.some((item) => item.imageId === imgId);
      let newSelected;

      if (exists) {
        newSelected = prevSelected.filter((item) => item.imageId !== imgId);
      } else {
        newSelected = [
          ...prevSelected,
          {
            projectId: parentProjectId,
            folderName: folder?.name,
            folderIndex: folderIndex,
            imageIndex: imageIndex,
            imageId: imgId,
            imagePath: img?.path || img.value?.path || '',
            imageData: img,
          },
        ];
      }
      return newSelected;
    });
  };

  const handleDeleteImages = async () => {
    if (selectedImages.length === 0) return;
    try {
      if (isUnassigned) {
        // For unassigned images, deactivate each image individually
        const deactivationPromises = selectedImages.map((img) => {
          const imageId = img.imageId;
          return deactiveImage(imageId);
        });

        const results = await Promise.all(deactivationPromises);

        // Filter out images that failed to deactivate
        const successfullyDeletedIds = selectedImages.filter((_, index) => results[index]).map((img) => img.imageId);

        // Add successfully deleted images to deleted set
        // setDeletedImageIds((prev) => {
        //   const newSet = new Set(prev);
        //   successfullyDeletedIds.forEach((id) => newSet.add(id));
        //   return newSet;
        // });

        setDeletedImagesByFolder((prev) => {
          const newSet = new Set(prev[folder.name] ?? []);
          successfullyDeletedIds.forEach((id) => newSet.add(id));
          return {
            ...prev,
            [folder.name]: newSet,
          };
        });

        // Update local state
        setImagesData((prev) =>
          prev?.filter((item) => {
            const itemId = item.id || item.attributeId;
            return !successfullyDeletedIds.includes(itemId);
          })
        );
      } else {
        // For assigned images, use the deleteImages API
        const imagesToDelete = selectedImages.map((img) => ({
          folderName: img.folderName || folder?.name || '',
          imageId: img.imageId,
        }));

        await deleteImages(parentProjectId, imagesToDelete);

        // Add to deleted images set
        // setDeletedImageIds((prev) => {
        //   const newSet = new Set(prev);
        //   selectedImages.forEach((img) => {
        //     const imageId = img.id || img.attributeId;
        //     newSet.add(imageId);
        //   });
        //   return newSet;
        // });

        setDeletedImagesByFolder((prev) => {
          const newSet = new Set(prev[folder.name] ?? []);
          selectedImages.forEach((img) => {
            const imageId = img.imageId;
            newSet.add(imageId);
          });
          return {
            ...prev,
            [folder.name]: newSet,
          };
        });

        // Update local state
        setImagesData((prev) =>
          prev?.filter((item) => {
            const itemId = item.imageId;
            return !selectedImages.some((sel) => sel.imageId === itemId);
          })
        );
      }

      setSelectedImages([]);
    } catch (error) {
      console.error('Failed to delete images:', error);
    }
  };

  // const handleMoveImages = async (folderName: string, imageId: string, path: string, images: any) => {
  //   const project: any = projects.find((p) => p.attributeId === parentProjectId);
  //   const folderIndex = project && project?.value?.folders.findIndex((folder: any) => folder.name === folderName);
  //   const imageIndex = project?.value?.folders[folderIndex]?.images.findIndex((img: any) => img.id === imageId);

  //   setSelectedImagesToMove({
  //     folderName: folderName,
  //   imageId,
  //   projectId: parentProjectId,
  //   folderIndex: folderIndex ?? -1,
  //   imageIndex: imageIndex ?? -1,
  //   imagePath: path,
  //   imageData,
  //   });
  //   setOpenModalMoveImages(true);
  // };

  const handleMoveImages = async (payload: MoveImagesToFolderAction) => {
    if (selectedImages.length === 0) return;

    try {
      // Build selectedImages array with correct SelectedMovingImageState structure
      const selectedMovingImages: SelectedMovingImageState[] = selectedImages.map((img) => {
        const imageId = img.imageId;
        return {
          imageId,
          imageData: img.imageData,
          projectId: parentProjectId,
          folderName: img.folderName || folder?.name || '',
          folderIndex: payload.from.folderIndex,
          imageIndex: imagesData.findIndex((item: any) => item.imageId === imageId),
          imagePath: img.imagePath,
        };
      });

      const movePayload: MoveImagesToFolderAction = {
        ...payload,
        from: {
          folderName: folder?.name || '',
          projectId: parentProjectId,
          folderIndex: payload.from.folderIndex,
        },
        selectedImages: selectedMovingImages,
      };

      await moveImages(movePayload, isUnassigned);

      // Add all moved images to deleted set for this folder
      // setDeletedImageIds((prev) => {
      //   const newSet = new Set(prev);
      //   selectedImages.forEach((img) => {
      //     const imageId = img.id || img.attributeId;
      //     newSet.add(imageId);
      //   });
      //   return newSet;
      // });

      setDeletedImagesByFolder((prev) => {
        const newSet = new Set(prev[folder.name] ?? []);
        selectedMovingImages.forEach((img) => newSet.add(img.imageId));
        return {
          ...prev,
          [folder.name]: newSet,
        };
      });

      // Update local state - remove moved images
      setImagesData((prev) =>
        prev?.filter((item) => {
          const itemId = item.id || item.attributeId;
          return !selectedImages.some((sel) => sel.imageId === itemId);
        })
      );

      setSelectedImages([]);
      setOpenModalMoveImages(false);
    } catch (error) {
      console.log('Error when moving images: ', error);
    }
  };
  const breadcrumbSeparatorColor = useColorModeValue('zinc.500', 'zinc.400');

  return (
    <>
      <Flex direction="column" w="full" h="full" gap={4}>
        <HStack spacing={2} align="center">
          <Box flex="1" minWidth="200px" overflow="hidden" mr="auto" display="flex" alignItems="center">
            {isUnassigned ? (
              <Text fontSize="lg" fontWeight="bold" color="text.primary">
                {folder?.name === 'Unassigned'
                  ? t('common:unassigned')
                  : folder?.name === 'Uploads'
                  ? t('common:uploads')
                  : folder?.name || t('common:folder')}
              </Text>
            ) : (
              <Breadcrumb fontSize="md" separator={<ChevronRightIcon size={16} color={breadcrumbSeparatorColor} />}>
                {folderPath?.map((item, idx) => (
                  <BreadcrumbItem key={`${item.id}-${idx}`} isCurrentPage={idx === folderPath.length - 1}>
                    {idx === folderPath.length - 1 ? (
                      <Text color="text.primary">{item.displayName}</Text>
                    ) : (
                      <BreadcrumbLink
                        as="button"
                        onClick={() => handleBreadcrumbClick(idx)}
                        color="text.secondary"
                        _hover={{ textDecoration: 'underline' }}
                      >
                        {item.displayName}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                ))}
              </Breadcrumb>
            )}
          </Box>
          <HStack spacing={2}>
            <GridSwitcher columns={columns} onChange={handleColChange} />
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
            <ChakraButton variant="secondary" leftIcon={<AddIconThin />} onClick={() => handleGenerateClick('')} size="sm">
              {translatorCommonNS('generate_image')}
            </ChakraButton>
          </HStack>
        </HStack>
        {filteredImages && filteredImages.length ? (
          <Box flex={1} overflowY="auto" maxHeight="calc(100vh - 200px)">
            <Box className={`layout-columns-${columns}`} pb={6}>
              {filteredImages?.map((img, index) => {
                const imgId = img.id || img.attributeId;
                const isSelected = selectedImages.some((item) => item.imageId === imgId);
                return (
                  <ImageItem
                    key={img.id || img.attributeId || index}
                    img={{
                      id: img.id || img.attributeId,
                      path: img?.path || img.value?.path || '',
                      folderName: folder?.name || '',
                      thumbnail: img?.thumbnail || img.value?.thumbnail || '',
                      dimensions: img?.dimensions || img.value?.dimensions || '',
                    }}
                    isFavorite={img?.isFavorite || false}
                    isBookmarked={img?.isBookmarked || false}
                    matchedAttribute={img}
                    deleteImage={handleDeleteImage}
                    moveImage={handleMoveImage}
                    isSelected={isSelected}
                    onSelect={() => {
                      handleSelectImages(img);
                    }}
                    handleOnClick={() => handleImageCardClick(index)}
                    onModalClose={handleModalClose}
                    // Navigation props
                    allImages={filteredImages?.map((item) => ({
                      id: item.id || item.attributeId,
                      path: item?.path || item.value?.path || '',
                      folderName: folder?.name || '',
                      thumbnail: item?.thumbnail || item.value?.thumbnail || '',
                      dimensions: item?.dimensions || item.value?.dimensions || '',
                    }))}
                    currentImageIndex={navigationCurrentIndex === index ? currentIndex : undefined}
                    onNavigationPrevious={handlePrev}
                    onNavigationNext={handleNext}
                    onImportImage={onImportImage}
                  />
                );
              })}
            </Box>
          </Box>
        ) : isLoading && isUnassigned ? (
          <LoadingPage minHeight="calc(100vh - 230px)" />
        ) : (
          <Flex direction="column" align="center" justify="center" h="calc(100vh - 142px)">
            <Empty
              emptyText={t('notification:no_image_yet')}
              emptyDesc={t('notification:get_started_by_creating_your_first_project_to_begin_managing_your_work_efficiently')}
            />
          </Flex>
        )}

        {/* Pagination for unassigned images and uploads */}
        {pagination && onPageChange && (
          <Box mt={4}>
            <Pagination
              total={pagination.total}
              pages={pagination.pages}
              pageSize={pagination.pageSize}
              currentPage={pagination.currentPage}
              className={''}
              changePage={onPageChange}
            />
          </Box>
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
      </Flex>
      <ModalMoveImage
        projects={projects}
        isOpen={openModalMoveImage}
        onClose={() => setOpenModalMoveImage(false)}
        onMove={handleMoveImageToFolder}
        modelData={selectedImage}
      />
      <ModalMoveImages
        projects={projects}
        isOpen={openModalMoveImages}
        onClose={() => setOpenModalMoveImages(false)}
        onMove={handleMoveImages}
        selectedImages={selectedImages}
      />
    </>
  );
};

export default GridFolderItems;



