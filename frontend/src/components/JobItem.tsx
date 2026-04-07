import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { relativeTimeFormat } from '@/utils/time';
import { t } from 'i18next';
import {
  CreationTypeEnum,
  CreationTypeToTextMap,
  InputTypeEnum,
  InputTypeToTextMap,
  StyleEnum,
  StyleToTextMap,
} from '@/constants/attribute-enum';
import ArrowRightIcon from '@/shared/icons/ArrowRightIcon';
import { VIEW_OPTIONS } from '@/constants';
import HeartFillIcon from '@/shared/icons/HeartFillIcon';
import ImageCard from '@/shared/card/ImageCard';
import {
  IconButton,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  useBoolean,
  useColorMode,
  ModalCloseButton,
  Image,
  useToast,
  Tooltip,
  useClipboard,
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { EditIcon, Wand2 } from 'lucide-react';
import { useInlineEditImage } from '@/common/context/InlineEditImageContext';
import { toggleBookmark, toggleFavorite } from '@/actions/inspiration';
import { useAppDispatch } from '@/store';
import BookmarkFillIcon from '@/shared/icons/BookmarkFillIcon';
import { PaginationType } from '@/types/pagination';
import { useTranslation } from 'react-i18next';
import imageUtils from '@/utils/image';
import { getHistoryJobModelLabels } from '@/utils/modelLabels';
import { ImageLoadingSpinner } from './ImageLoadingSpinner';
import { ImageWithPlaceholder } from './ImageWithPlaceholder';
import { HistoryJobDto } from '@/actions/history';
import { ImageAPI } from '@/actions/image';
import { useNavigate } from 'react-router-dom';

const PROGRESS_STATUSES = ['progress', 'waiting', 'active'];

const formatJobId = (id?: string | null, length: number = 5, appendEllipsis: boolean = true): string => {
  if (!id) return '';
  const sanitized = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (sanitized.length <= length) {
    return sanitized;
  }
  const suffix = appendEllipsis ? '...' : '';
  return `${sanitized.slice(0, length)}${suffix}`;
};

const clampProgress = (value?: number | null): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
};

const formatDimensionsBadge = (dimensions?: string | null): string => {
  if (!dimensions) return '';
  const trimmed = dimensions.split('(')[0]?.trim() || dimensions;
  return trimmed.replace(/\s+/g, '');
};

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const hasMeaningfulValue = (value?: string | number | null): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && value !== 0;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }
    return trimmed !== '0' && trimmed !== '0.0';
  }
  return false;
};

const getAspectRatioValue = (dimensions?: string | null): string | null => {
  if (!dimensions) {
    return null;
  }
  const [rawWidth, rawHeight] = dimensions.split('x');
  const width = Number(rawWidth);
  const height = Number(rawHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || height === 0) {
    return null;
  }
  return `${width} / ${height}`;
};

interface JobItemProps {
  job: HistoryJobDto;
  isSelected: boolean;
  viewMode?: string;
  isPublishMethod?: boolean;
  isDeleteMethod?: boolean;
  onToggle: () => void;
  fetchData: (pagination: PaginationType, orderBy: string, inputType: string[], creationType: string) => void;
  blobUrl: string;
  onMoveToProject?: (job: HistoryJobDto) => void;
}

const JobItem: React.FC<JobItemProps> = ({
  job,
  isSelected,
  viewMode,
  isPublishMethod,
  isDeleteMethod: _isDeleteMethod,
  onToggle,
  fetchData,
  blobUrl,
  onMoveToProject,
}) => {
  const [imageFullScreen, toggleImageFullScreen] = useBoolean();
  const { colorMode } = useColorMode();
  const [currentSelectedImage, setCurrentSelectedImage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(job.isFavorite || false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(job.isBookmarked || false);
  const [loading, setLoading] = useState<boolean>(false);
  const toast = useToast();
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);
  const dispatch = useAppDispatch();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const inlineEditImage = useInlineEditImage();
  const isDarkMode = colorMode === 'dark';

  const method = job?.method || '';
  const normalizedStatus = (job?.status || '').toLowerCase();
  const isProcessing = PROGRESS_STATUSES.includes(normalizedStatus);
  const progressValue = clampProgress(job?.progress);
  const shortJobId = useMemo(() => formatJobId(job?.jobId, 5, true), [job?.jobId]);
  const dimensionBadge = useMemo(() => formatDimensionsBadge(job?.dimensions), [job?.dimensions]);
  const jobRelativeTime = useMemo(
    () => relativeTimeFormat(job.createdAt, 0, (i18n?.language as 'en' | 'de') || 'en'),
    [job.createdAt, i18n?.language]
  );
  const jobTypeLabel = method.startsWith('EDIT_') ? t('edit:edited', 'Edited') : t('common:generated', 'Generated');
  const creationLabel = useMemo(() => {
    if (!job?.creationType && !method.startsWith('EDIT_')) {
      return '';
    }
    if (method.startsWith('EDIT_')) {
      return t(`common:edit`);
    }
    const key = CreationTypeToTextMap.get(job.creationType as CreationTypeEnum);
    return key ? t(`generate:${key}`) : '';
  }, [job?.creationType, method, i18n?.language]);
  const inputLabel = useMemo(() => {
    if (!job?.inputType) {
      return '';
    }
    const key = InputTypeToTextMap.get(job.inputType as InputTypeEnum);
    if (!key) {
      return '';
    }
    const namespace = method.startsWith('EDIT_') ? 'edit' : 'generate';
    return t(`${namespace}:${key}`);
  }, [job?.inputType, method, i18n?.language]);
  const styleLabel = useMemo(() => {
    if (!job?.selectedStyle) {
      return '';
    }
    const key = StyleToTextMap.get(job.selectedStyle as StyleEnum);
    return key ? t(`generate:${key}`) : '';
  }, [job?.selectedStyle, i18n?.language]);
  const jobModelLabels = useMemo(() => getHistoryJobModelLabels(job), [job]);
  const promptText = job?.enabledAiPrompt ? job?.enhancedPrompt : job?.prompt;
  const { hasCopied: hasCopiedPrompt, onCopy: onCopyPrompt } = useClipboard(promptText || '');
  const showInputValue = hasMeaningfulValue(job?.inputValue);
  const showStyleValue = hasMeaningfulValue(job?.styleValue);
  const showCreativeValue = hasMeaningfulValue(job?.creativityValue);
  const showValueColumn = showInputValue || showStyleValue || showCreativeValue;
  const thumbnailAspectRatio = getAspectRatioValue(job?.dimensions);
  const detailImageAspectRatio = thumbnailAspectRatio;
  const statusLabel = useMemo(() => {
    if (!job?.status) {
      return '';
    }
    return job.status.replace(/_/g, ' ');
  }, [job?.status]);

  // Keyboard navigation for fullscreen modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!imageFullScreen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        toggleImageFullScreen.off();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [imageFullScreen, toggleImageFullScreen]);
  const handleClickImage = async (imageKey: string) => {
    try {
      setLoading(true);
      const blob = await ImageAPI.fetchImage(imageKey, { thumbnail: false, format: 'jpg' });
      if (blob) {
        // Revoke previous object URL to avoid memory leaks
        if (currentSelectedImage) {
          URL.revokeObjectURL(currentSelectedImage);
        }
        const url = URL.createObjectURL(blob);
        setCurrentSelectedImage(url);
        setLoading(false);
        toggleImageFullScreen.on();
      } else {
        setLoading(false);
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('image_not_found'),
          status: 'error',
          duration: 4000,
          position: 'bottom-right',
          isClosable: true,
        });
      }
    } catch {
      setLoading(false);
      toast({
        title: translatorNotificationNS('image'),
        description: translatorNotificationNS('something_went_wrong'),
        status: 'error',
        duration: 4000,
        position: 'bottom-right',
        isClosable: true,
      });
    }
  };
  const handleOnFavorite = (e: any) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const attributeId = job.jobId;
      const version = job.version;

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
      const attributeId = job.jobId;
      const version = job.version;

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
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const imageFullScreenRender = () => {
    return (
      <Modal
        isOpen={imageFullScreen}
        onClose={toggleImageFullScreen.toggle}
        size="full"
        isCentered
        motionPreset="slideInBottom"
        scrollBehavior="inside"
        closeOnOverlayClick={true}
        onOverlayClick={toggleImageFullScreen.toggle}
      >
        <ModalOverlay bg="rgba(0,0,0,0.8)" backdropFilter="blur(2px)" />
        <ModalContent
          bg="transparent"
          boxShadow="none"
          display="flex"
          alignItems="center"
          justifyContent="center"
          className="!rounded-none"
        >
          <ModalCloseButton className="!top-2 !right-2 z-[100]" />
          <ModalBody
            position="relative"
            display="flex"
            gap={10}
            alignItems="center"
            flexDirection={'column'}
            justifyContent="center"
            p={0}
          >
            <div className="fixed inset-0 z-50 flex items-center justify-center max-h-screen">
              <div className="relative flex items-center justify-center w-full max-h-screen p-20">
                {(() => {
                  // Default dimensions for fullscreen modal when no dimensions available
                  const defaultModalDimensions = { width: 1980, height: 960 };
                  let modalDimensions = defaultModalDimensions;
                  if (job?.dimensions) {
                    const [widthStr, heightStr] = job.dimensions.split('x');
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
                    <ImageWithPlaceholder
                      preloadedBlobUrl={currentSelectedImage || blobUrl}
                      imageKey={job.imageKey}
                      thumbnail={false}
                      format="jpg"
                      className="object-contain rounded-lg"
                      dimensions={job?.dimensions}
                      style={{
                        maxWidth: displayWidth,
                        maxHeight: displayHeight,
                        width: displayWidth,
                        height: displayHeight,
                      }}
                      objectFit="contain"
                      loading="lazy"
                      imageUrl={job.path}
                      thumbnailUrl={job.thumbnail}
                    />
                  );
                })()}

                <div className="flex gap-1.5 absolute z-[100] bottom-8">
                  <IconButton
                    variant="ghost"
                    icon={<HeartFillIcon active={!!isFavorite} height={14} width={14} />}
                    onClick={(e) => handleOnFavorite(e)}
                    bg={colorMode === 'dark' ? '#0E0E0E' : 'rgba(0,0,0,0.32)'} // Semi-transparent black
                    _hover={{ bg: 'rgba(0,0,0,0.5)' }} // Darker on hover
                    px="6px"
                    py="4px"
                    isDisabled={loading}
                    borderRadius="lg"
                    aria-label={''}
                    size="sm"
                  />
                  <IconButton
                    variant="ghost"
                    icon={<BookmarkFillIcon active={isBookmarked} height={14} width={14} />}
                    onClick={(e) => handleOnBookmark(e)}
                    bg={colorMode === 'dark' ? '#0E0E0E' : 'rgba(0,0,0,0.32)'} // Semi-transparent black
                    _hover={{ bg: 'rgba(0,0,0,0.5)' }} // Darker on hover
                    px="6px"
                    py="4px"
                    isDisabled={loading}
                    borderRadius="lg"
                    aria-label={''}
                    size="sm"
                  />
                  <IconButton
                    variant="ghost"
                    icon={
                      <span className="flex items-center gap-1.5">
                        <EditIcon size={14} color="#fff" />
                        <span className="text-xs font-normal text-white">{t(`common:edit_image`)}</span>
                      </span>
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      const imageUrl = job?.path || job?.thumbnail || '';
                      const imageKey = job?.imageKey || '';
                      const dimensions = job?.dimensions || null;

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
                    bg={colorMode === 'dark' ? '#0E0E0E' : 'rgba(0,0,0,0.32)'} // Semi-transparent black
                    _hover={{ bg: 'rgba(0,0,0,0.5)' }}
                    px="6px"
                    py="4px"
                    borderRadius="lg"
                    aria-label={''}
                    size="sm"
                  />
                  {job?.prompt && job?.creationType && !method.startsWith('EDIT_') && (
                    <IconButton
                      variant="ghost"
                      icon={
                        <span className="flex items-center gap-1.5">
                          <Wand2 size={14} color="#fff" />
                          <span className="text-xs font-normal text-white">{t(`common:use_template`)}</span>
                        </span>
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        const searchParams = new URLSearchParams({
                          mode: 'generate',
                          ...(job.prompt && { prompt: job.prompt }),
                          ...(job.creationType && { creationType: job.creationType }),
                          ...(job.inputType && { inputType: job.inputType }),
                          ...(job.selectedStyle && { style: job.selectedStyle }),
                          ...(job.inputValue !== undefined && { inputValue: String(job.inputValue) }),
                          ...(job.creativityValue !== undefined && { creativityValue: String(job.creativityValue) }),
                          ...(job.styleValue !== undefined && { styleValue: String(job.styleValue) }),
                          ...(job.seed && { seed: job.seed }),
                          ...(job.enhancedPrompt && { enhancedPrompt: job.enhancedPrompt }),
                        });
                        navigate(`/generate?${searchParams.toString()}`);
                        toggleImageFullScreen.off();
                      }}
                      bg={colorMode === 'dark' ? '#0E0E0E' : 'rgba(0,0,0,0.32)'}
                      _hover={{ bg: 'rgba(0,0,0,0.5)' }}
                      px="6px"
                      py="4px"
                      borderRadius="lg"
                      aria-label={''}
                      size="sm"
                    />
                  )}
                </div>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  };

  const cardClassName = cn(
    'cursor-pointer rounded-lg border transition-colors',
    isSelected
      ? isDarkMode
        ? 'border-zinc-700 bg-zinc-950/90 shadow-sm'
        : 'border-zinc-300 bg-white/70 shadow-sm'
      : isDarkMode
      ? 'border-transparent bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900'
      : 'border-transparent bg-white hover:border-zinc-200'
  );
  const thumbnailWrapperClass = cn(
    'relative w-16 flex-shrink-0 overflow-hidden rounded-md cursor-zoom-in',
    isDarkMode ? 'bg-zinc-900' : 'bg-gray-200'
  );
  const jobHeadingClass = cn(
    'flex flex-wrap items-center gap-2 text-sm font-semibold',
    isDarkMode ? 'text-zinc-100' : 'text-txtPrimary'
  );
  const jobMetaRowClass = cn('flex flex-wrap items-center gap-2 text-[12px]', isDarkMode ? 'text-zinc-400' : 'text-secondary');
  const jobTypeChipClass = cn(
    'rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
    isDarkMode ? 'bg-zinc-950 text-zinc-50 border-zinc-800' : 'bg-zinc-100 text-zinc-700 border-zinc-200'
  );
  const jobIdPillClass = cn(
    'rounded-full px-2 py-0.5 text-[11px] font-mono',
    isDarkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-100 text-zinc-600'
  );
  const dimensionPillClass = cn(
    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
    isDarkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-100 text-zinc-600'
  );
  const metaChipClass = cn(
    'rounded-md px-2 py-0.5 text-[12px] font-medium',
    isDarkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-100 text-zinc-700'
  );
  const modelChipClass = cn(
    'rounded-md px-2 py-0.5 text-[12px] font-medium',
    isDarkMode ? 'bg-amber-900 text-amber-200' : 'bg-amber-50 text-amber-700'
  );
  const progressValueClass = isDarkMode ? 'text-zinc-100' : 'text-txtPrimary';
  const progressRailClass = cn('h-1.5 w-full overflow-hidden rounded-full', isDarkMode ? 'bg-zinc-900' : 'bg-borderLight');
  const progressFillClass = cn('h-full rounded-full transition-all duration-300', isDarkMode ? 'bg-zinc-200' : 'bg-txtPrimary');
  const successChipClass = cn(
    'rounded-full px-3 py-1 text-xs font-medium',
    isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'
  );
  const arrowButtonClass = cn(
    'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
    isDarkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-100 text-zinc-600'
  );
  const detailCardClass = cn('rounded-lg border p-3', isDarkMode ? 'border-zinc-800 bg-zinc-950' : 'border-borderLight bg-gray-50');
  const detailContentClass = cn('md:col-span-3 rounded-lg px-4 py-3', isDarkMode ? 'bg-zinc-900' : 'bg-white');
  const detailLabelClass = cn('text-xs', isDarkMode ? 'text-zinc-500' : 'text-secondary');
  const detailValueClass = cn('text-sm', isDarkMode ? 'text-zinc-100' : 'text-txtPrimary');
  const promptTextClass = cn('mt-1 text-sm leading-tight', isDarkMode ? 'text-zinc-100' : 'text-txtPrimary');
  const timestampClass = cn('text-xs', isDarkMode ? 'text-zinc-500' : 'text-secondary');

  if (viewMode === VIEW_OPTIONS.GRID) {
    return (
      <>
        <div className="block w-full" onClick={onToggle}>
          <ImageCard
            key={job.imageKey}
            id={job.jobId}
            img={{
              key: job.imageKey,
              preloadedBlobUrl: blobUrl,
              path: job.path,
              thumbnail: job.thumbnail,
              dimensions: job.dimensions,
            }}
            matchedAttribute={{
              userId: job.userId,
              attributeId: job.imageKey,
              version: job.version,
              value: {
                key: job.imageKey,
                // prefer a path returned by the history API (job.path or job.thumbnail)
                path: job.path || job.thumbnail || imageUtils.getImageUrl(job.imageKey, false, 'jpg'),
              },
              actions: job.actions,
              createdAt: job.createdAt,
              // type: job.type,
              // projectAttributeId?: string;
              // projectTitle?: string;
              isPublished: job.isPublished,
            }}
            hasPublish={isPublishMethod}
            handleDelCallback={() => {
              fetchData(
                {
                  currentPage: 1,
                  pageSize: 20,
                  total: 0,
                  pages: 0,
                } as PaginationType,
                'desc',
                [],
                ''
              );
            }}
            isPublished={job.isPublished}
            isFavorite={job.isFavorite}
            isBookmarked={job.isBookmarked}
            hasAction={true}
            handleOnClick={() => toggleImageFullScreen.on()}
            onMoveToProject={onMoveToProject ? () => onMoveToProject(job) : undefined}
          />
        </div>

        {imageFullScreenRender()}
      </>
    );
  }

  // Refined list view experience
  return (
    <>
      <div className={cardClassName} onClick={onToggle}>
        <div className="flex flex-wrap items-center gap-4 px-4 py-4">
          <div
            className={thumbnailWrapperClass}
            style={{ aspectRatio: thumbnailAspectRatio ?? '1 / 1' }}
            onClick={(event) => {
              event.stopPropagation();
              if (job.imageKey) {
                handleClickImage(job.imageKey);
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && job.imageKey) {
                event.preventDefault();
                event.stopPropagation();
                handleClickImage(job.imageKey);
              }
            }}
          >
            <ImageWithPlaceholder
              imageKey={job.imageKey}
              preloadedBlobUrl={blobUrl}
              imageUrl={job.path}
              thumbnailUrl={job.thumbnail}
              thumbnail={true}
              dimensions={job?.dimensions || undefined}
              className="h-full w-full"
              borderRadius="6px"
              objectFit="cover"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className={jobHeadingClass}>
              <span title={job.jobId ? `JOB ${job.jobId}` : undefined}>{`JOB ${shortJobId || job.jobId || '-'}`}</span>
              {job.jobId && <span className={jobIdPillClass}>#{job.jobId.slice(-4).toUpperCase()}</span>}
              {dimensionBadge && <span className={dimensionPillClass}>{dimensionBadge}</span>}
            </div>
            <div className={jobMetaRowClass}>
              <span className={jobTypeChipClass}>{jobTypeLabel}</span>
              {creationLabel && <span className={metaChipClass}>{creationLabel}</span>}
              {inputLabel && <span className={metaChipClass}>{inputLabel}</span>}
              {styleLabel && <span className={metaChipClass}>{styleLabel}</span>}
              {jobModelLabels.map((label) => (
                <span key={label} className={modelChipClass}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex min-w-[190px] flex-col items-end gap-1 text-sm">
            {isProcessing ? (
              <div className="w-full min-w-[160px]">
                <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-secondary">
                  <span>{statusLabel || 'In progress'}</span>
                  <span className={cn('font-semibold', progressValueClass)}>{progressValue}%</span>
                </div>
                <div className={progressRailClass}>
                  <div className={progressFillClass} style={{ width: `${progressValue}%` }}></div>
                </div>
              </div>
            ) : (
              <span className={successChipClass}>{t(`notification:success`)}</span>
            )}
            <span className={timestampClass}>{jobRelativeTime}</span>
          </div>

          <div className={arrowButtonClass}>
            <ArrowRightIcon className={`h-5 w-5 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {isSelected && (
          <div className="px-4 pb-4">
            <div className={detailCardClass}>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="md:col-span-2">
                  {job.imageKey ? (
                    <div
                      className={cn(
                        'relative h-full w-full cursor-zoom-in overflow-hidden rounded-xl shadow-sm',
                        isDarkMode ? 'bg-zinc-900' : 'bg-gray-100'
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleClickImage(job.imageKey);
                      }}
                      style={{
                        aspectRatio: detailImageAspectRatio ?? '4 / 3',
                      }}
                    >
                      <ImageWithPlaceholder
                        imageKey={job.imageKey}
                        thumbnail={false}
                        format="webp"
                        dimensions={job?.dimensions || undefined}
                        className="h-full w-full"
                        objectFit="contain"
                        loading="lazy"
                        borderRadius="8px"
                        imageUrl={job.path}
                        thumbnailUrl={job.thumbnail}
                      />
                      <div className="absolute bottom-3 right-3 z-10 flex gap-1.5">
                        <IconButton
                          variant="ghost"
                          icon={<HeartFillIcon active={!!isFavorite} height={14} width={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOnFavorite(e);
                          }}
                          bg={colorMode === 'dark' ? '#0E0E0E' : 'rgba(0,0,0,0.32)'}
                          _hover={{ bg: 'rgba(0,0,0,0.5)' }}
                          px="6px"
                          py="4px"
                          isDisabled={loading}
                          borderRadius="lg"
                          aria-label={t('common:favorite', 'Favorite')}
                          size="sm"
                        />
                        <IconButton
                          variant="ghost"
                          icon={<BookmarkFillIcon active={isBookmarked} height={14} width={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOnBookmark(e);
                          }}
                          bg={colorMode === 'dark' ? '#0E0E0E' : 'rgba(0,0,0,0.32)'}
                          _hover={{ bg: 'rgba(0,0,0,0.5)' }}
                          px="6px"
                          py="4px"
                          isDisabled={loading}
                          borderRadius="lg"
                          aria-label={t('common:bookmark', 'Bookmark')}
                          size="sm"
                        />
                        <IconButton
                          variant="ghost"
                          icon={
                            <span className="flex items-center gap-1.5">
                              <EditIcon size={14} color="#fff" />
                              <span className="text-xs font-normal text-white">{t(`common:edit_image`)}</span>
                            </span>
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            const imageUrl = job?.path || job?.thumbnail || '';
                            const imageKey = job?.imageKey || '';
                            const dimensions = job?.dimensions || null;

                            if (imageUrl && imageKey) {
                              if (inlineEditImage && inlineEditImage({ imageUrl, imageKey, dimensions })) {
                                return;
                              }
                              const searchParams = new URLSearchParams({
                                mode: 'edit',
                                imageUrl,
                                imageKey,
                                ...(dimensions && { dimensions }),
                              });

                              navigate(`/generate?${searchParams.toString()}`);
                            }
                          }}
                          bg={colorMode === 'dark' ? '#0E0E0E' : 'rgba(0,0,0,0.32)'}
                          _hover={{ bg: 'rgba(0,0,0,0.5)' }}
                          px="6px"
                          py="4px"
                          borderRadius="lg"
                          aria-label={t('common:edit_image')}
                          size="sm"
                        />
                        {job?.prompt && job?.creationType && !method.startsWith('EDIT_') && (
                          <IconButton
                            variant="ghost"
                            icon={
                              <span className="flex items-center gap-1.5">
                                <Wand2 size={14} color="#fff" />
                                <span className="text-xs font-normal text-white">{t(`common:use_template`)}</span>
                              </span>
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              const searchParams = new URLSearchParams({
                                mode: 'generate',
                                ...(job.prompt && { prompt: job.prompt }),
                                ...(job.creationType && { creationType: job.creationType }),
                                ...(job.inputType && { inputType: job.inputType }),
                                ...(job.selectedStyle && { style: job.selectedStyle }),
                                ...(job.inputValue !== undefined && { inputValue: String(job.inputValue) }),
                                ...(job.creativityValue !== undefined && { creativityValue: String(job.creativityValue) }),
                                ...(job.styleValue !== undefined && { styleValue: String(job.styleValue) }),
                                ...(job.seed && { seed: job.seed }),
                                ...(job.enhancedPrompt && { enhancedPrompt: job.enhancedPrompt }),
                              });
                              navigate(`/generate?${searchParams.toString()}`);
                            }}
                            bg={colorMode === 'dark' ? '#0E0E0E' : 'rgba(0,0,0,0.32)'}
                            _hover={{ bg: 'rgba(0,0,0,0.5)' }}
                            px="6px"
                            py="4px"
                            borderRadius="lg"
                            aria-label={t('common:use_template')}
                            size="sm"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <ImageLoadingSpinner />
                  )}
                </div>

                <div className={detailContentClass}>
                  <div className="grid gap-4 lg:grid-cols-5">
                    <div className="space-y-2">
                      <div>
                        <label className={detailLabelClass}>{t(`common:type`)}:</label>
                        <p className={detailValueClass}>{creationLabel || '-'}</p>
                      </div>
                      <div>
                        <label className={detailLabelClass}>{t(`generate:input`)}:</label>
                        <p className={detailValueClass}>{inputLabel || '-'}</p>
                      </div>
                      <div>
                        <label className={detailLabelClass}>{t(`generate:style`)}:</label>
                        <p className={detailValueClass}>{styleLabel || ' - '}</p>
                      </div>
                      <div>
                        <label className={detailLabelClass}>{t('history:ai_model', 'AI Model')}:</label>
                        {jobModelLabels.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {jobModelLabels.map((label) => (
                              <span key={label} className={modelChipClass}>
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className={detailValueClass}>{t('history:not_available', 'Not available')}</p>
                        )}
                      </div>
                    </div>
                    {showValueColumn && (
                      <div className="space-y-2">
                        {showInputValue && (
                          <div>
                            <label className={detailLabelClass}>{t(`generate:input_value`)}:</label>
                            <p className={detailValueClass}>{job.inputValue}</p>
                          </div>
                        )}
                        {showStyleValue && (
                          <div>
                            <label className={detailLabelClass}>{t(`generate:style_value`)}:</label>
                            <p className={detailValueClass}>{job.styleValue}</p>
                          </div>
                        )}
                        {showCreativeValue && (
                          <div>
                            <label className={detailLabelClass}>{t(`generate:creative_value`)}:</label>
                            <p className={detailValueClass}>{job.creativityValue}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {job.uploadImage && (
                      <div className="space-y-2">
                        <label className={detailLabelClass}>{t(`common:upload`)}:</label>
                        <div className={cn('mt-2 h-24 w-24 overflow-hidden rounded-md', isDarkMode ? 'bg-zinc-900' : 'bg-gray-700')}>
                          <Image
                            src={job.uploadImage}
                            alt="Upload preview"
                            fallback={<ImageLoadingSpinner />}
                            className="h-full w-full rounded-md object-cover"
                          />
                        </div>
                      </div>
                    )}

                    <div className={`${job.uploadImage ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-1`}>
                      <div className="flex items-center justify-between gap-2">
                        <label className={detailLabelClass}>{t(`generate:prompt`)}:</label>
                        {promptText && (
                          <Tooltip
                            label={hasCopiedPrompt ? t('notification:copied', 'Copied') : t('notification:copy', 'Copy')}
                            closeOnClick={false}
                          >
                            <IconButton
                              aria-label={t('notification:copy', 'Copy')}
                              size="sm"
                              variant="ghost"
                              icon={hasCopiedPrompt ? <CheckIcon /> : <CopyIcon />}
                              onClick={(event) => {
                                event.stopPropagation();
                                onCopyPrompt();
                              }}
                            />
                          </Tooltip>
                        )}
                      </div>
                      <p className={promptTextClass}>{promptText}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {imageFullScreenRender()}
    </>
  );
};

export default React.memo(JobItem);

