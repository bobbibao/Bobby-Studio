import { Box, Checkbox, IconButton, Menu, MenuButton, MenuItem, MenuList, useToast, Flex, Text } from '@chakra-ui/react';

import { handleUseTemplate, isEditMethod } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import { ActionEntity, GeneratedImageAttributeEntity, OriginalImageAttributeEntity } from '@/common/dtos/attribute/common.dto';
import { useEffect, useMemo, useState, memo, type MouseEvent } from 'react';
import HeartFillIcon from '../icons/HeartFillIcon';
import BookmarkFillIcon from '../icons/BookmarkFillIcon';
import { useAppDispatch } from '@/store';
import RemoveIcon from '../icons/RemoveIcon';
import { API } from '@/actions/favorite';
import ThreeDotIconVertical from '../icons/ThreeDotIconVertical';
import { useTranslation } from 'react-i18next';
import { toggleBookmark, toggleFavorite } from '@/actions/inspiration';
import { useAuth } from '@/common/context/useAuthContext';
import { ImageWithPlaceholder } from '@/components/ImageWithPlaceholder';
import { ImageAPI } from '@/actions/image';
import { EditIcon, Wand2, Info } from 'lucide-react';
import { ImageNavigationArrows } from '@/components/ImageNavigationArrows';
import { useInlineEditImage } from '@/common/context/InlineEditImageContext';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import ImageInfoOverlay from '@/components/ImageInfoOverlay';
import { collectModelLabels, extractPromptFromSources, getEditVersionLabel } from '@/utils/imageMeta';

const ImageCard: React.FC<{
  id: string;
  img: {
    key: string;
    path?: string;
    thumbnail?: string;
    dimensions?: string | null;
    preloadedBlobUrl?: string; // Add support for preloaded images
  };
  matchedAttribute?: UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>;
  hasPublish?: boolean;
  isPublished?: boolean;
  hasAction?: boolean;
  isFavorite?: boolean;
  isBookmarked?: boolean;
  handleCallback?: (isFavorite: boolean, isBookmarked: boolean) => void;
  handleDelCallback?: () => void;
  handleOnClick?: () => void;
  onModalClose?: () => void;
  refreshData?: (attributeId?: string) => void;
  onMoveToProject?: (job: any) => void;
  jobData?: any; // Full job object for move to project
  // Navigation props for image grid navigation
  allImages?: any[];
  currentImageIndex?: number;
  onNavigationPrevious?: () => void;
  onNavigationNext?: () => void;
}> = ({
  id,
  img,
  matchedAttribute,
  hasPublish,
  isPublished,
  hasAction,
  isFavorite: isFavoriteProp,
  isBookmarked: isBookmarkedProp,
  handleCallback,
  handleDelCallback,
  handleOnClick,
  onModalClose,
  onMoveToProject,
  jobData,
  allImages,
  currentImageIndex,
  onNavigationPrevious,
  onNavigationNext,
}) => {
  const { t } = useTranslation();

  const dispatch = useAppDispatch();
  const toast = useToast();
  const navigate = useNavigate();
  const inlineEditImage = useInlineEditImage();

  // Consistent button styling across themes
  const buttonBg = 'rgba(0, 0, 0, 0.7)';
  const buttonHoverBg = 'rgba(0, 0, 0, 0.85)';

  const [loading, setLoading] = useState(false);
  const [published, setPublished] = useState(isPublished);
  const [isFavorite, setIsFavorite] = useState(isFavoriteProp);
  const [isBookmarked, setIsBookmarked] = useState(isBookmarkedProp);
  const [isOpen, setIsOpen] = useState(false);
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [infoActions, setInfoActions] = useState<ActionEntity | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  useAuth();
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);

  // Drag and drop
  const imagePath = img?.path || img?.thumbnail || img?.preloadedBlobUrl || '';
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: 'IMAGE',
      item: { id, path: imagePath },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [id, imagePath]
  );
  // Hide default drag preview
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);
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

  const infoTimestamp = resolvedAttribute?.createdAt || jobData?.createdAt;

  const infoPrompt = useMemo(
    () => extractPromptFromSources({ jobData, matchedAttribute: resolvedAttribute }),
    [jobData, resolvedAttribute]
  );

  const infoModelLabels = useMemo(
    () => collectModelLabels({ jobData, matchedAttribute: resolvedAttribute }),
    [jobData, resolvedAttribute]
  );

  const derivedMethod =
    matchedAttribute?.method ||
    jobData?.method ||
    (matchedAttribute?.actions as { method?: string })?.method ||
    (jobData?.actions as { method?: string })?.method ||
    '';
  const derivedMethodString = typeof derivedMethod === 'string' ? derivedMethod : '';
  const isEditedImage = derivedMethodString ? isEditMethod(derivedMethodString) : false;
  const typeLabel = isEditedImage ? t('edit:edited', 'Edited') : t('common:generated', 'Generated');
  const editVersionLabel = isEditedImage
    ? getEditVersionLabel(jobData?.editVersionNumber ?? matchedAttribute?.editVersionNumber)
    : null;
  const overlayTypeLabel = isEditedImage && editVersionLabel ? `${typeLabel} ${editVersionLabel}` : typeLabel;

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

  const handleOnUseTemplate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleOnPublish = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const params = {
        ids: [id],
        isPublished: e.target.checked,
      };
      const result = await API.publishImage(params);
      if (result && result.data) {
        setPublished(!published);
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('image_published_successfully'),
          status: 'success',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleOnFavorite = (e: any) => {
    e.stopPropagation();
    setLoading(true);
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
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleOnBookmark = (e: any) => {
    e.stopPropagation();
    setLoading(true);
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
      if (handleCallback) handleCallback(isFavorite ?? false, !isBookmarked);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const ensureInfoMetadata = () => {
    if (!matchedAttribute || matchedAttribute.actions || infoActions || infoLoading) {
      return;
    }
    const attributeId = matchedAttribute.attributeId || id;
    if (!attributeId) {
      return;
    }
    setInfoLoading(true);
    ImageAPI.fetchAttributeActions(attributeId, matchedAttribute.version)
      .then((actions) => {
        setInfoActions(actions);
      })
      .catch((error) => {
        console.error('Failed to load attribute actions for info overlay', error);
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

  const handleOnDelete = async (e: any) => {
    e.stopPropagation();
    const result = await API.deactiveImage(id);
    if (result && result.id) {
      toast({
        title: translatorNotificationNS('image'),
        description: translatorNotificationNS('image_deleted_successfully'),
        status: 'success',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
      if (handleDelCallback) {
        handleDelCallback();
      }
    } else {
      toast({
        title: translatorNotificationNS('image'),
        description: translatorNotificationNS('something_wrong_when_deleting_image'),
        status: 'error',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
    }
  };

  return (
    <Box
      w="full"
      overflow="hidden"
      position="relative"
      borderRadius="lg"
      className="group cursor-pointer"
      data-id={id}
      ref={drag}
      opacity={isDragging ? 0.5 : 1}
      onClick={() => {
        if (handleOnClick) {
          handleOnClick();
          setIsOpen(true);
          setShowInfoOverlay(false);
        }
      }}
    >
      <ImageWithPlaceholder
        imageKey={img?.key}
        thumbnail={true}
        format="webp"
        dimensions={img?.dimensions || '1980x960'}
        className="w-full rounded-lg transition-transform duration-300 group-hover:scale-105"
        objectFit="cover"
        loading="lazy"
        borderRadius="lg" // Ensure image has radius
        _hover={{ borderRadius: 'lg' }} // Explicit hover state
        preloadedBlobUrl={img?.preloadedBlobUrl} // Pass preloaded image if available
        thumbnailUrl={img?.thumbnail}
        imageUrl={img?.path}
      />
      {hasPublish && (
        <Box
          className="absolute top-3 left-3 z-10"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Checkbox
            isChecked={published}
            onChange={(e) => {
              e.stopPropagation();
              handleOnPublish(e);
            }}
            size="lg"
            className="checkbox-inspiration"
          />
        </Box>
      )}
      <Box className="absolute inset-0" borderRadius="lg">
        <Box
          className={`flex h-full w-full flex-col items-center justify-end transition-opacity ${
            showInfoOverlay ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'
          }`}
          borderRadius="lg" // Match parent radius
        >
          <Box className="absolute top-3 right-3 flex items-center space-x-1">
            <button
              className="rounded-md !flex items-center justify-center gap-1.5 px-2.5 py-1 text-white text-xs h-[26px] backdrop-blur-md"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
              onClick={(e) => {
                e.stopPropagation();
                const imageUrl = img?.path || img?.thumbnail || img?.preloadedBlobUrl || '';
                const imageKey = img?.key || '';
                const dimensions = img?.dimensions || null;

                // Navigate to generate page with edit mode and image data
                const searchParams = new URLSearchParams({
                  mode: 'edit',
                  imageUrl: imageUrl,
                  ...(imageKey && { imageKey }),
                  ...(dimensions && { dimensions }),
                });

                navigate(`/generate?${searchParams.toString()}`);
              }}
            >
              <EditIcon height={14} width={14} />
              <span>{t('common:edit')}</span>
            </button>

            {hasAction && (
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
                  {onMoveToProject && (
                    <MenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveToProject(jobData || matchedAttribute);
                      }}
                    >
                      {t('common:move_to_project')}
                    </MenuItem>
                  )}
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
              onClick={handleInfoClick}
              className="!rounded-md !flex items-center justify-center !w-[26px] !h-[26px] !min-w-0 backdrop-blur-md"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            />
            {!isEditMethod(matchedAttribute?.method) && (
              <Box
                as="button"
                className="rounded-md px-2.5 py-1 !text-white text-xs transition !h-[26px] backdrop-blur-md"
                onClick={handleOnUseTemplate}
                bg="blackAlpha.700"
              >
                {t('common:use_template')}
              </Box>
            )}
          </Box>

          <Box className="bottom-3 right-3 absolute flex flex-row items-center justify-center space-x-1">
            <IconButton
              size="sm"
              icon={<HeartFillIcon active={!!isFavorite} height={14} width={14} />}
              variant="unstyled"
              aria-label="Favorite"
              onClick={handleOnFavorite}
              isDisabled={loading}
              className="!rounded-md !flex items-center justify-center !w-[26px] !h-[26px] !min-w-0 backdrop-blur-md"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            />

            <IconButton
              size="sm"
              icon={<BookmarkFillIcon active={isBookmarked} height={14} width={14} />}
              variant="unstyled"
              aria-label="Bookmark"
              isDisabled={loading}
              className="!rounded-md !flex items-center justify-center !w-[26px] !h-[26px] !min-w-0 backdrop-blur-md"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
              onClick={handleOnBookmark}
            />
            {/* Edit button moved to top-right beside the three-dot menu */}
          </Box>
        </Box>
        <ImageInfoOverlay
          isVisible={showInfoOverlay && !isOpen}
          createdAt={infoTimestamp}
          prompt={infoPrompt}
          model={infoModelLabels}
          onClose={() => setShowInfoOverlay(false)}
          isLoading={infoLoading}
          typeLabel={overlayTypeLabel}
          zIndex={5} // keep overlay beneath sticky filter bar while still covering the card
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
                allImages && currentImageIndex !== undefined && allImages[currentImageIndex]
                  ? allImages[currentImageIndex].value || allImages[currentImageIndex]
                  : img;
              // Default dimensions for fullscreen modal when no dimensions available
              const defaultModalDimensions = { width: 1980, height: 960 };
              let modalDimensions = defaultModalDimensions;
              if (displayImage?.dimensions) {
                const [widthStr, heightStr] = displayImage.dimensions.split('x');
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
                    <ImageWithPlaceholder
                      imageKey={displayImage?.key}
                      thumbnail={false}
                      format="jpg"
                      dimensions={displayImage.dimensions || '1980x960'}
                      className="object-contain rounded-lg"
                      style={{
                        maxWidth: displayWidth,
                        maxHeight: displayHeight,
                        width: displayWidth,
                        height: displayHeight,
                      }}
                      objectFit="contain"
                      onClick={(e) => e.stopPropagation()}
                      loading="eager"
                      preloadedBlobUrl={displayImage?.preloadedBlobUrl} // Pass preloaded image if available
                      imageUrl={displayImage?.path}
                      thumbnailUrl={displayImage?.thumbnail}
                    />
                    <Box className="absolute top-3 left-3">
                      <span
                        className="rounded-md px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md"
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                      >
                        {overlayTypeLabel}
                      </span>
                    </Box>
                    <ImageInfoOverlay
                      isVisible={showInfoOverlay && isOpen}
                      createdAt={infoTimestamp}
                      prompt={infoPrompt}
                      model={infoModelLabels}
                      onClose={() => setShowInfoOverlay(false)}
                      isLoading={infoLoading}
                      typeLabel={overlayTypeLabel}
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
            {matchedAttribute && (
              <Flex gap={1.5} position="absolute" bottom={8} left="50%" transform="translateX(-50%)" zIndex={100}>
                <IconButton
                  variant="ghost"
                  icon={<Info size={14} color="white" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInfoClick(e);
                  }}
                  bg={buttonBg}
                  _hover={{ bg: buttonHoverBg }}
                  px="6px"
                  py="4px"
                  borderRadius="lg"
                  aria-label={t('common:info')}
                  isDisabled={loading}
                  size="sm"
                />
                <IconButton
                  variant="ghost"
                  icon={<HeartFillIcon active={!!isFavorite} height={14} width={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOnFavorite(e);
                  }}
                  bg={buttonBg}
                  _hover={{ bg: buttonHoverBg }}
                  px="6px"
                  py="4px"
                  borderRadius="lg"
                  aria-label=""
                  isDisabled={loading}
                  size="sm"
                />
                <IconButton
                  variant="ghost"
                  icon={<BookmarkFillIcon active={!!isBookmarked} height={14} width={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOnBookmark(e);
                  }}
                  bg={buttonBg}
                  _hover={{ bg: buttonHoverBg }}
                  px="6px"
                  py="4px"
                  borderRadius="lg"
                  aria-label=""
                  isDisabled={loading}
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
                    const displaySource =
                      allImages && currentImageIndex !== undefined && allImages[currentImageIndex]
                        ? allImages[currentImageIndex].value
                        : img;
                    const imageUrl = displaySource?.path || displaySource?.thumbnail || displaySource?.preloadedBlobUrl || '';
                    const imageKey = matchedAttribute?.attributeId || '';
                    const dimensions = displaySource?.dimensions || null;

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
                  bg={buttonBg}
                  _hover={{ bg: buttonHoverBg }}
                  px="6px"
                  py="4px"
                  borderRadius="lg"
                  aria-label=""
                  size="sm"
                />
                {matchedAttribute && !isEditMethod(matchedAttribute?.method) && (
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
                      if (onModalClose) {
                        onModalClose();
                      }
                    }}
                    bg={buttonBg}
                    _hover={{ bg: buttonHoverBg }}
                    px="6px"
                    py="4px"
                    borderRadius="lg"
                    aria-label=""
                    size="sm"
                    isDisabled={loading}
                  />
                )}
              </Flex>
            )}
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
            className="top-3 right-3 absolute z-50 text-white"
          >
            <RemoveIcon />
          </button>
        </div>
      )}
    </Box>
  );
};

export default memo(ImageCard);

