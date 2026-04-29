import { Box, Flex, Image, MenuButton, Menu, IconButton, MenuList, MenuItem, useToast, Checkbox, Text } from '@chakra-ui/react';
import Button from '@/shared/buttons/Button';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useState, useEffect, useMemo, type MouseEvent } from 'react';
import { ImageData } from '../@/types';
import { ActionEntity } from '@/common/dtos/attribute/common.dto';
import imagePlaceholder from '@/assets/img/layout/image-placeholder.png';
import ThreeDotIconVertical from '@/shared/icons/ThreeDotIconVertical';
import HeartFillIcon from '@/shared/icons/HeartFillIcon';
import BookmarkFillIcon from '@/shared/icons/BookmarkFillIcon';
import { useAppDispatch, useAppSelector } from '@/store';
import { useNavigate } from 'react-router-dom';
import { handleUseTemplate, isEditMethod } from '@/utils';
import RemoveIcon from '@/shared/icons/RemoveIcon';
import { ActionTypeEnum } from '@/constants/attribute-enum';
import { useTranslation } from 'react-i18next';
import { toggleBookmark, toggleFavorite } from '@/actions/inspiration';
import { useAuth } from '@/common/context/useAuthContext';
import { ImageWithPlaceholder } from '@/components/ImageWithPlaceholder';
import { ImageAPI } from '@/actions/image';
import { EditIcon, Wand2, Info } from 'lucide-react';
import { useInlineEditImage } from '@/common/context/InlineEditImageContext';
import { ImageNavigationArrows } from '@/components/ImageNavigationArrows';
import ImageInfoOverlay from '@/components/ImageInfoOverlay';
import { collectModelLabels, extractPromptFromSources, getEditVersionLabel } from '@/utils/imageMeta';

const ImageItem: React.FC<{
  img: ImageData;
  isFavorite?: boolean;
  isBookmarked?: boolean;
  matchedAttribute?: any;
  showAction?: boolean;
  deleteImage: (folderName: string, imageId: string) => void;
  moveImage: (folderName: string, imageId: string, path: string, imageData: any) => void;
  onSelect?: (img: ImageData) => void;
  isSelected?: boolean;
  handleOnClick?: () => void;
  onModalClose?: () => void;
  // Navigation props for image grid navigation
  allImages?: ImageData[];
  currentImageIndex?: number;
  onNavigationPrevious?: () => void;
  onNavigationNext?: () => void;
  onImportImage?: (img: ImageData) => void;
}> = ({
  img,
  isFavorite: isFavoriteProp,
  isBookmarked: isBookmarkedProp,
  matchedAttribute,
  showAction = true,
  deleteImage,
  moveImage,
  onSelect,
  isSelected,
  handleOnClick,
  onModalClose,
  allImages,
  currentImageIndex,
  onNavigationPrevious,
  onNavigationNext,
  onImportImage,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(isSelected || false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const inlineEditImage = useInlineEditImage();
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);
  const { user } = useAuth();
  const modalButtonBg = 'rgba(0, 0, 0, 0.7)';
  const modalButtonHoverBg = 'rgba(0, 0, 0, 0.85)';
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'IMAGE',
    item: { id: img.id, path: img.path, folderName: img.folderName },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));
  // Hide default drag preview - we'll show custom minimal preview
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const getCurrentImage = () => {
    return assignedAttributes.find((attr) => attr.attributeId === img.id);
  };

  const assignedAttributes = useAppSelector((state) => state.projectManagement.assignedAttributes);

  const [isBookmarked, setIsBookmarked] = useState(isBookmarkedProp);
  const [isFavorite, setIsFavorite] = useState(isFavoriteProp);
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [infoActions, setInfoActions] = useState<ActionEntity | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  // Handle modal close with escape key
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.code === 'Escape' && isOpen) {
        setIsOpen(false);
        if (onModalClose) {
          onModalClose();
        }
      }
    }

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onModalClose]);

  // Sync modal state with currentImageIndex prop
  useEffect(() => {
    const shouldBeOpen = currentImageIndex !== undefined;
    if (shouldBeOpen !== isOpen) {
      setIsOpen(shouldBeOpen);
    }
  }, [currentImageIndex, isOpen]);

  useEffect(() => {
    if (!showInfoOverlay) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowInfoOverlay(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showInfoOverlay]);

  const handleOnMove = (e: any) => {
    e.stopPropagation();
    moveImage(img.folderName as string, img.id as string, img.path as string, matchedAttribute);
  };

  const checkEnableUseTemplate = () => {
    const matchedAttribute = getCurrentImage();
    return !isEditMethod(matchedAttribute?.method);
  };

  const resolvedAttribute = useMemo(() => {
    if (!matchedAttribute) return matchedAttribute;
    if (matchedAttribute.actions) return matchedAttribute;
    if (infoActions) {
      return {
        ...matchedAttribute,
        actions: infoActions,
      };
    }
    return matchedAttribute;
  }, [matchedAttribute, infoActions]);

  const infoTimestamp = resolvedAttribute?.createdAt;

  const infoPrompt = useMemo(() => extractPromptFromSources({ matchedAttribute: resolvedAttribute }), [resolvedAttribute]);

  const infoModelLabels = useMemo(() => collectModelLabels({ matchedAttribute: resolvedAttribute }), [resolvedAttribute]);

  const derivedMethod = resolvedAttribute?.method || (resolvedAttribute?.actions as { method?: string })?.method || '';
  const derivedMethodString = typeof derivedMethod === 'string' ? derivedMethod : '';
  const isEditedImage = derivedMethodString ? isEditMethod(derivedMethodString) : false;
  const typeLabel = isEditedImage ? t('edit:edited', 'Edited') : t('common:generated', 'Generated');
  const editVersionLabel = isEditedImage ? getEditVersionLabel(resolvedAttribute?.editVersionNumber) : null;
  const overlayTypeLabel = isEditedImage && editVersionLabel ? `${typeLabel} ${editVersionLabel}` : typeLabel;

  const handleOnUseTemplate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const attributeId = matchedAttribute?.attributeId;
      const version = matchedAttribute?.version;
      const imageData = {
        ...img,
        dimensions: img.dimensions ?? undefined,
      };

      if (attributeId) {
        // fetch actions
        const response = await ImageAPI.fetchAttributeActions(attributeId, version);

        const attrWithActions = {
          ...(matchedAttribute || {}),
          actions: response,
        };
        handleUseTemplate(attrWithActions, navigate, imageData);
      } else {
        handleUseTemplate(matchedAttribute, navigate, imageData);
      }
    } catch {
      // still attempt to proceed without actions
      const imageData = {
        ...img,
        dimensions: img.dimensions ?? undefined,
      };
      handleUseTemplate(matchedAttribute, navigate, imageData);
    }
  };

  const handleOnFavorite = (e: any) => {
    // e.stopPropagation();
    // const existingImage = assignedAttributes.find(
    //   (attr) => attr.attributeId === img.id
    // );
    // const existingUnassignedImage = unassignedAttributes.find(
    //   (attr) => attr.attributeId === img.id
    // );
    // if (!existingImage && !existingUnassignedImage) return;

    // const baseImage = existingImage || existingUnassignedImage;
    // if (!baseImage) return;

    // const updatedImage = {
    //   ...baseImage,
    //   userId: baseImage.userId,
    //   attributeId: baseImage.attributeId,
    //   value: baseImage.value,
    //   actions: {
    //     ...baseImage.actions,
    //     isFavorite: !isFavorite,
    //   },
    // };
    // console.log(
    //   'handleOnFavorite',
    //   updatedImage,
    //   existingImage,
    //   existingUnassignedImage
    // );
    // dispatch(updateAssignedImage(updatedImage));
    // setIsFavorite(!isFavorite);
    e.stopPropagation();
    try {
      const attributeId = matchedAttribute?.attributeId;
      const version = matchedAttribute?.version;

      if (!attributeId || !version) {
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('something_went_wrong'),
          status: 'error',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
        return;
      }

      dispatch(toggleFavorite({ attributeId, version }));
      setIsFavorite(!isFavorite);
    } catch (error) {
    } finally {
    }
  };

  const handleOnBookmark = (e: any) => {
    // e.stopPropagation();
    // const existingImage = assignedAttributes.find(
    //   (attr) => attr.attributeId === img.id
    // );
    // const existingUnassignedImage = unassignedAttributes.find(
    //   (attr) => attr.attributeId === img.id
    // );
    // if (!existingImage && !existingUnassignedImage) return;

    // const baseImage = existingImage || existingUnassignedImage;
    // if (!baseImage) return;

    // const updatedImage = {
    //   ...baseImage,
    //   userId: baseImage.userId,
    //   attributeId: baseImage.attributeId,
    //   value: baseImage.value,
    //   actions: {
    //     ...baseImage.actions,
    //     isBookmarked: !isBookmarked,
    //   },
    // };
    // console.log(
    //   'handleOnBookmark',
    //   updatedImage,
    //   existingImage,
    //   existingUnassignedImage
    // );
    // dispatch(updateAssignedImage(updatedImage));
    // setIsBookmarked(!isBookmarked);
    e.stopPropagation();
    try {
      const attributeId = matchedAttribute?.attributeId;
      const version = matchedAttribute?.version;

      if (!attributeId || !version) {
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('something_went_wrong'),
          status: 'error',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
        return;
      }

      dispatch(toggleBookmark({ attributeId, version }));
      setIsBookmarked(!isBookmarked);
    } catch (error) {
    } finally {
    }
  };

  const ensureInfoMetadata = () => {
    if (!matchedAttribute || matchedAttribute.actions || infoActions || infoLoading) {
      return;
    }
    const attributeId = matchedAttribute.attributeId || matchedAttribute.id || img.id;
    if (!attributeId) {
      return;
    }
    setInfoLoading(true);
    ImageAPI.fetchAttributeActions(attributeId, matchedAttribute.version)
      .then((actions) => {
        setInfoActions(actions);
      })
      .catch((error) => {
        console.error('Failed to load attribute actions for project image overlay', error);
      })
      .finally(() => setInfoLoading(false));
  };

  const handleInfoClick = (event: MouseEvent) => {
    event.stopPropagation();
    const nextState = !showInfoOverlay;
    setShowInfoOverlay(nextState);
    if (nextState) {
      ensureInfoMetadata();
    }
  };

  const handleOnDelete = (e: any) => {
    e.stopPropagation();
    deleteImage(img.folderName as string, img.id as string);
  };

  const handleOnSelect = (e: any) => {
    e.stopPropagation();
    setSelected(!selected);
  };

  return (
    <Box
      w="100%"
      height="100%"
      overflow="hidden"
      position="relative"
      display="flex"
      flexDirection="column"
      borderRadius="lg"
      data-id={img.id}
      className="mb-4 group cursor-pointer"
      opacity={isDragging ? 0.5 : 1}
      ref={drag}
      role="group"
      onClick={() => {
        if (handleOnClick) {
          handleOnClick();
          setIsOpen(true);
          setShowInfoOverlay(false);
        }
      }}
    >
      <ImageWithPlaceholder
        imageKey={img?.key || img?.id || ''}
        thumbnail={true}
        format="webp"
        dimensions={img?.dimensions}
        className="w-full rounded-lg"
        objectFit="cover"
        loading="lazy"
        borderRadius="lg" // Ensure image has radius
        _hover={{ borderRadius: 'lg' }} // Explicit hover state
        thumbnailUrl={img?.thumbnail || img?.path}
        imageUrl={img?.path || img?.thumbnail}
      />
      <Box
        className="top-3 left-4 absolute"
        onClick={(e) => {
          e.stopPropagation();
        }}
        opacity={isSelected ? 1 : 0}
        transition="opacity 0.3s"
        zIndex={20}
        _groupHover={{ opacity: 1 }}
      >
        {!onImportImage && (
          <Checkbox
            isChecked={isSelected}
            onChange={(e) => {
              handleOnSelect(e);
              if (onSelect) onSelect(img);
            }}
            size="lg"
            className="checkbox-project"
          />
        )}
      </Box>
      <Box className="absolute inset-0" borderRadius="lg" zIndex={10}>
        <Box
          className={`flex h-full w-full flex-col items-center justify-end transition-opacity ${
            showInfoOverlay ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'
          }`}
          borderRadius="lg"
          bg="rgba(0, 0, 0, 0.5)"
          cursor={onImportImage ? 'default' : 'pointer'}
          onClick={(e) => {
            if (!onImportImage) {
              setIsOpen(true);
            } else {
              e.stopPropagation();
            }
          }}
        >
          <Box className="absolute top-2.5 left-12 ">
            <span
              className="rounded-md px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            >
              {overlayTypeLabel}
            </span>
          </Box>
          {onImportImage ? (
            <Box className="absolute inset-0 flex items-center justify-center">
              <Button
                label={t('common:add_to_canvas', { defaultValue: 'Add to Canvas' })}
                extraClass={'rounded-md px-4 py-2 !text-white text-sm transition backdrop-blur-md hover:bg-white/20'}
                onClick={(e) => {
                  e.stopPropagation();
                  onImportImage(img);
                }}
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
              />
            </Box>
          ) : (
            <>
              <Box className="absolute top-3 right-3 flex items-center space-x-1">
                <button
                  className="rounded-md !flex items-center justify-center gap-1.5 px-2.5 py-1 text-white text-xs h-[26px] backdrop-blur-md"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const imageUrl = img?.path || img?.thumbnail || '';
                    const dimensions = img?.dimensions || null;
                    const imageKey = img?.id || '';
                    if (imageUrl && imageKey) {
                      if (inlineEditImage && inlineEditImage({ imageUrl, imageKey, dimensions })) {
                        return;
                      }
                      // Navigate to generate page with edit mode and image data
                      const searchParams = new URLSearchParams({
                        mode: 'edit',
                        imageUrl: imageUrl,
                        imageKey: imageKey,
                        ...(dimensions && { dimensions }),
                      });

                      navigate(`/generate?${searchParams.toString()}`);
                    }
                  }}
                >
                  <EditIcon height={14} width={14} />
                  <span>{t('common:edit')}</span>
                </button>

                {showAction && (
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<ThreeDotIconVertical className="w-3 h-3" />}
                      aria-label="Options"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="!w-[26px] !h-[26px] !min-w-0 backdrop-blur-md"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                      color="white"
                    />
                    <MenuList className="">
                      <MenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOnMove(e);
                        }}
                      >
                        {t('common:move')}
                      </MenuItem>
                      <MenuItem onClick={handleOnDelete}>{t('common:delete_')}</MenuItem>
                    </MenuList>
                  </Menu>
                )}
              </Box>

              <Box className="absolute bottom-3 left-3 flex items-center space-x-1">
                <IconButton
                  size="sm"
                  variant="unstyled"
                  icon={<Info size={14} color="#fff" />}
                  aria-label={t('common:info')}
                  className="!rounded-md !flex items-center justify-center !w-[26px] !h-[26px] !min-w-0 backdrop-blur-md"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                  onClick={handleInfoClick}
                />
                {!isEditMethod(matchedAttribute?.method) && (
                  <Button
                    label={t('common:use_template')}
                    isDisabled={!matchedAttribute}
                    extraClass={'rounded-md px-2.5 py-1 !text-white text-xs transition !h-[26px] backdrop-blur-md'}
                    onClick={handleOnUseTemplate}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                  />
                )}
              </Box>

              <Box className="bottom-3 right-3 absolute flex flex-row items-center justify-center space-x-1">
                <IconButton
                  size="sm"
                  icon={<HeartFillIcon active={!!isFavorite} height={14} width={14} />}
                  variant="unstyled"
                  aria-label="Favorite"
                  onClick={handleOnFavorite}
                  className="!rounded-md !flex items-center justify-center !w-[26px] !h-[26px] !min-w-0 backdrop-blur-md"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                />

                <IconButton
                  size="sm"
                  icon={<BookmarkFillIcon active={isBookmarked} height={14} width={14} />}
                  variant="unstyled"
                  aria-label="Bookmark"
                  className="!rounded-md !flex items-center justify-center !w-[26px] !h-[26px] !min-w-0 backdrop-blur-md"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                  onClick={handleOnBookmark}
                />
              </Box>
            </>
          )}
        </Box>
        <ImageInfoOverlay
          isVisible={showInfoOverlay && !isOpen}
          createdAt={infoTimestamp}
          prompt={infoPrompt}
          model={infoModelLabels}
          onClose={() => setShowInfoOverlay(false)}
          isLoading={infoLoading}
        />
      </Box>
      {isOpen && (
        <div className="bg-black/15 bg-opacity-65 backdrop-blur-md fixed inset-0 z-50 flex items-center justify-center max-h-screen">
          <div
            className="relative flex items-center justify-center w-full max-h-screen p-20"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setShowInfoOverlay(false);
              if (onModalClose) {
                onModalClose();
              }
            }}
          >
            {(() => {
              // Get the image to display based on currentImageIndex
              // If allImages is provided and currentImageIndex is valid, show that image
              // Otherwise, fall back to the card's own image
              const displayImage =
                allImages && currentImageIndex !== undefined && allImages[currentImageIndex] ? allImages[currentImageIndex] : img;

              // Default dimensions for fullscreen modal when no dimensions available
              const defaultModalDimensions = { width: 1980, height: 960 };
              let modalDimensions = defaultModalDimensions;
              if (displayImage?.dimensions) {
                const [widthStr, heightStr] = displayImage?.dimensions?.split('x');
                const width = Number(widthStr);
                const height = Number(heightStr);
                if (!isNaN(width) && !isNaN(height)) {
                  modalDimensions = { width, height };
                }
              }

              // Calculate maximum size that fits in viewport while maintaining aspect ratio
              const aspectRatio = modalDimensions.width / modalDimensions.height;
              const maxWidth = window.innerWidth * 0.9; // 90% of viewport width
              const maxHeight = window.innerHeight * 0.8; // 80% of viewport height

              let displayWidth = modalDimensions.width;
              let displayHeight = modalDimensions.height;

              // Scale down if larger than viewport
              if (displayWidth > maxWidth) {
                displayWidth = maxWidth;
                displayHeight = displayWidth / aspectRatio;
              }
              if (displayHeight > maxHeight) {
                displayHeight = maxHeight;
                displayWidth = displayHeight * aspectRatio;
              }

              return (
                <>
                  <Box position="relative" display="inline-flex">
                    <Box position="relative" display="inline-flex">
                      <ImageWithPlaceholder
                        imageKey={displayImage?.key || displayImage?.id || ''}
                        thumbnail={false}
                        format="jpg"
                        dimensions={displayImage?.dimensions || '1980x960'}
                        className="object-contain rounded-lg"
                        style={{
                          maxWidth: displayWidth,
                          maxHeight: displayHeight,
                          width: displayWidth,
                          height: displayHeight,
                        }}
                        objectFit="contain"
                        onClick={(e) => e.stopPropagation()}
                        loading="lazy"
                        imageUrl={displayImage?.path || displayImage?.thumbnail}
                      />
                      <Box className="absolute top-3 left-3">
                        <span
                          className="rounded-md px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md"
                          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                        >
                          {overlayTypeLabel}
                        </span>
                      </Box>
                    </Box>
                    <ImageInfoOverlay
                      isVisible={showInfoOverlay && isOpen}
                      createdAt={infoTimestamp}
                      prompt={infoPrompt}
                      model={infoModelLabels}
                      onClose={() => setShowInfoOverlay(false)}
                      isLoading={infoLoading}
                    />
                  </Box>
                  {/* Show navigation arrows if images and navigation callbacks are available */}
                  {allImages &&
                    allImages.length > 1 &&
                    onNavigationPrevious &&
                    onNavigationNext &&
                    typeof currentImageIndex === 'number' && (
                      <ImageNavigationArrows
                        currentIndex={currentImageIndex}
                        totalImages={allImages.length}
                        onPrevious={onNavigationPrevious}
                        onNext={onNavigationNext}
                      />
                    )}
                </>
              );
            })()}
            {/* Action buttons */}
            {(() => {
              const displayImage =
                allImages && currentImageIndex !== undefined && allImages[currentImageIndex] ? allImages[currentImageIndex] : img;
              const currentMatchedAttribute = displayImage?.matchedAttribute || matchedAttribute;

              if (!currentMatchedAttribute) return null;

              return (
                <Flex gap={1.5} position="absolute" bottom={8} left="50%" transform="translateX(-50%)" zIndex={100}>
                  <IconButton
                    variant="ghost"
                    icon={<Info size={14} color="white" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInfoClick(e);
                    }}
                    bg={modalButtonBg}
                    _hover={{ bg: modalButtonHoverBg }}
                    px="6px"
                    py="4px"
                    borderRadius="lg"
                    aria-label={t('common:info')}
                    size="sm"
                  />
                  <IconButton
                    variant="ghost"
                    icon={<HeartFillIcon active={!!isFavorite} height={14} width={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOnFavorite(e);
                    }}
                    bg={modalButtonBg}
                    _hover={{ bg: modalButtonHoverBg }}
                    px="6px"
                    py="4px"
                    borderRadius="lg"
                    aria-label=""
                    size="sm"
                  />
                  <IconButton
                    variant="ghost"
                    icon={<BookmarkFillIcon active={!!isBookmarked} height={14} width={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOnBookmark(e);
                    }}
                    bg={modalButtonBg}
                    _hover={{ bg: modalButtonHoverBg }}
                    px="6px"
                    py="4px"
                    borderRadius="lg"
                    aria-label=""
                    size="sm"
                  />
                  <IconButton
                    variant="ghost"
                    icon={
                      <Flex align="center" gap={1.5}>
                        <EditIcon size={14} color="white" />
                        <Text color="white" fontSize="xs" fontWeight="normal">
                          {t(`common:edit_image`)}
                        </Text>
                      </Flex>
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      const imageUrl = displayImage?.path || '';
                      const imageKey = currentMatchedAttribute?.attributeId || '';
                      const dimensions = displayImage?.dimensions || null;

                      if (imageUrl && imageKey) {
                        if (inlineEditImage && inlineEditImage({ imageUrl, imageKey, dimensions })) {
                          setIsOpen(false);
                          if (onModalClose) {
                            onModalClose();
                          }
                          return;
                        }
                        const searchParams = new URLSearchParams({
                          mode: 'edit',
                          imageUrl: imageUrl,
                          imageKey: imageKey,
                          ...(dimensions && { dimensions }),
                        });
                        navigate(`/generate?${searchParams.toString()}`);
                        setIsOpen(false);
                        if (onModalClose) {
                          onModalClose();
                        }
                      }
                    }}
                    bg={modalButtonBg}
                    _hover={{ bg: modalButtonHoverBg }}
                    px="6px"
                    py="4px"
                    borderRadius="lg"
                    aria-label=""
                    size="sm"
                  />
                  {currentMatchedAttribute && !isEditMethod(currentMatchedAttribute?.method) && (
                    <IconButton
                      variant="ghost"
                      icon={
                        <Flex align="center" gap={1.5}>
                          <Wand2 size={14} color="white" />
                          <Text color="white" fontSize="xs" fontWeight="normal">
                            {t(`common:use_template`)}
                          </Text>
                        </Flex>
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOnUseTemplate(e);
                        setIsOpen(false);
                        setShowInfoOverlay(false);
                        if (onModalClose) {
                          onModalClose();
                        }
                      }}
                      bg={modalButtonBg}
                      _hover={{ bg: modalButtonHoverBg }}
                      px="6px"
                      py="4px"
                      borderRadius="lg"
                      aria-label=""
                      size="sm"
                    />
                  )}
                </Flex>
              );
            })()}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setShowInfoOverlay(false);
              if (onModalClose) {
                onModalClose();
              }
            }}
            className="top-4 right-4 absolute z-50 text-white"
          >
            <RemoveIcon />
          </button>
        </div>
      )}
    </Box>
  );
};

export default ImageItem;



