import React, { useMemo, useState } from 'react';
import JobItem from './JobItem';
import ImageCard from '@/shared/card/ImageCard';
import imageUtils from '@/utils/image';
import { VIEW_OPTIONS } from '@/constants';
import { PaginationType } from '@/types/pagination';
import {
  Box,
  Flex,
  Text,
  Stack,
  Divider,
  Tag,
  TagLabel,
  Wrap,
  WrapItem,
  IconButton,
  Tooltip,
  useColorModeValue,
  useClipboard,
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { relativeTimeFormat } from '@/utils/time';
import { useTranslation } from 'react-i18next';
import { HistoryJobDto } from '@/actions/history';
import { getHistoryJobModelLabels } from '@/utils/modelLabels';
import { getEditVersionLabel } from '@/utils/imageMeta';
import { useImageNavigation } from '@/hooks/useImageNavigation';

interface JobHistoryProps {
  viewMode?: string;
  historyJobs?: any[];
  isPublishMethod?: boolean;
  isDeleteMethod?: boolean;
  fetchData: (pagination: PaginationType, orderBy: string, inputType: string[], creationType: string) => void;
  getImage: (imageKey: string) => {
    blobUrl: string;
    isLoading: boolean;
    error: boolean;
  };
  onMoveToProject?: (job: any) => void;
}

type NormalizedHistoryJob = HistoryJobDto & {
  normalizedImage: {
    key: string;
    path?: string;
    thumbnail?: string;
    dimensions?: string | null;
    preloadedBlobUrl?: string;
  };
  matchedAttribute: any;
};

const DURATION_KEYS = [
  'generationTime',
  'generation_time',
  'processingTime',
  'processing_time',
  'processingTimeMs',
  'processing_time_ms',
  'duration',
  'durationMs',
  'duration_ms',
];

const parseDurationToSeconds = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    // Heuristic: values greater than 600 likely represent milliseconds
    return value > 600 ? value / 1000 : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    const numeric = parseFloat(trimmed.replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(numeric)) return null;
    if (lower.includes('ms')) {
      return numeric / 1000;
    }
    if (lower.endsWith('m') && !lower.endsWith('ms')) {
      return numeric * 60;
    }
    return numeric;
  }
  return null;
};

const extractGenerationDurationSeconds = (job: any): number | null => {
  for (const key of DURATION_KEYS) {
    const parsed = parseDurationToSeconds(job?.[key]);
    if (parsed !== null) {
      return parsed;
    }
  }

  if (job?.metadata && typeof job.metadata === 'object') {
    for (const key of DURATION_KEYS) {
      const parsed = parseDurationToSeconds(job.metadata?.[key]);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  return null;
};

const formatGenerationDurationLabel = (job: any): string | null => {
  const seconds = extractGenerationDurationSeconds(job);
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  if (seconds >= 60) {
    const minutes = seconds / 60;
    return `${minutes.toFixed(minutes >= 10 ? 1 : 2)}m`;
  }

  return `${seconds.toFixed(seconds >= 10 ? 1 : 2)}s`;
};

const formatAbsoluteDate = (dateString?: string, locale?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale || undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const getPromptText = (job: HistoryJobDto): string => {
  if (!job) return '';
  if (job.enabledAiPrompt && job.enhancedPrompt) {
    return job.enhancedPrompt;
  }
  return job.prompt || job.enhancedPrompt || '';
};

const buildSettingsEntries = (job: any, translate: (key: string, defaultText?: string) => string) => {
  const entries = [
    {
      key: 'steps',
      label: translate('history:num_inference_steps', 'Steps'),
      value: job?.step ?? job?.steps ?? job?.numSteps ?? job?.numInferenceSteps ?? job?.metadata?.step ?? job?.metadata?.steps,
    },
    {
      key: 'guidance',
      label: translate('history:guidance_scale', 'Guidance'),
      value: job?.guidance ?? job?.cfgScale ?? job?.guidanceScale ?? job?.metadata?.guidance,
    },
    {
      key: 'seed',
      label: translate('generate:seed', 'Seed'),
      value: job?.seed ?? translate('generate:use_random_seed', 'Random'),
    },
    {
      key: 'size',
      label: translate('history:image_size', 'Image size'),
      value: job?.imageSize ?? job?.dimensions ?? job?.metadata?.imageSize,
    },
  ];

  return entries.filter((entry) => entry.value !== undefined && entry.value !== null && entry.value !== '');
};

type HistoryGridCardProps = {
  job: NormalizedHistoryJob;
  isPublishMethod?: boolean;
  onRefresh: () => void;
  onImageClick: () => void;
  onMoveToProject?: (job: HistoryJobDto) => void;
  allImages?: Array<{ value: NormalizedHistoryJob['normalizedImage'] }>;
  currentImageIndex?: number;
  onNavigationNext?: () => void;
  onNavigationPrevious?: () => void;
  onModalClose?: () => void;
};

const HistoryGridCard: React.FC<HistoryGridCardProps> = ({
  job,
  isPublishMethod,
  onRefresh,
  onImageClick,
  onMoveToProject,
  allImages,
  currentImageIndex,
  onNavigationNext,
  onNavigationPrevious,
  onModalClose,
}) => {
  const { t, i18n } = useTranslation();
  const cardBg = useColorModeValue('white', 'zinc.950');
  const borderColor = useColorModeValue('blackAlpha.200', 'whiteAlpha.200');
  const mutedColor = useColorModeValue('zinc.500', 'zinc.400');
  const valueColor = useColorModeValue('zinc.900', 'whiteAlpha.900');
  const chipBg = useColorModeValue('zinc.50', 'whiteAlpha.100');
  const chipText = useColorModeValue('zinc.700', 'whiteAlpha.900');

  const promptText = useMemo(() => getPromptText(job), [job]);
  const { hasCopied: hasCopiedPrompt, onCopy: onCopyPrompt } = useClipboard(promptText || '');
  const modelLabels = useMemo(() => getHistoryJobModelLabels(job), [job]);

  const isEditedJob = useMemo(() => {
    if (!job?.method) return false;
    return job.method.toUpperCase().includes('EDIT');
  }, [job?.method]);
  const editVersionLabel = useMemo(() => getEditVersionLabel(job.editVersionNumber), [job.editVersionNumber]);
  const jobTypeToken = isEditedJob
    ? `${t('edit:edited', 'Edited')}${editVersionLabel ? ` ${editVersionLabel}` : ''}`
    : t('common:generated', 'Generated');
  const relativeLabel = useMemo(
    () => (job.createdAt ? relativeTimeFormat(job.createdAt, 0, (i18n?.language as 'en' | 'de') || 'en') : ''),
    [job.createdAt, i18n?.language]
  );
  const absoluteLabel = useMemo(() => formatAbsoluteDate(job.createdAt, i18n?.language), [job.createdAt, i18n?.language]);
  const generationDuration = useMemo(() => formatGenerationDurationLabel(job), [job]);
  const settingsEntries = useMemo(() => buildSettingsEntries(job, (key, fallback) => t(key, fallback)), [job, t]);
  return (
    <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="xl" overflow="hidden" shadow="md">
      <ImageCard
        id={job.jobId}
        img={job.normalizedImage}
        matchedAttribute={job.matchedAttribute as any}
        hasPublish={isPublishMethod}
        handleDelCallback={onRefresh}
        isPublished={job.isPublished}
        isFavorite={job.isFavorite}
        isBookmarked={job.isBookmarked}
        hasAction={true}
        handleOnClick={onImageClick}
        jobData={job}
        onMoveToProject={onMoveToProject ? () => onMoveToProject(job) : undefined}
        allImages={allImages}
        currentImageIndex={currentImageIndex}
        onNavigationNext={onNavigationNext}
        onNavigationPrevious={onNavigationPrevious}
        onModalClose={onModalClose}
      />

      <Box px={5} py={4} borderTop="1px solid" borderColor={borderColor}>
        <Stack spacing={4}>
          <Flex align="flex-start" justify="space-between" gap={4}>
            <Box>
              <Text fontWeight="semibold" color={valueColor} fontSize="sm" letterSpacing="wide">
                {jobTypeToken}
              </Text>
              <Text fontSize="sm" color={valueColor} lineHeight={1.3}>
                {relativeLabel || t('common:not_available', 'Not available')}
              </Text>
              <Text fontSize="xs" color={mutedColor}>
                {absoluteLabel}
              </Text>
            </Box>
            <Box textAlign="right">
              <Text fontSize="xs" textTransform="uppercase" color={mutedColor}>
                {t('history:generation_time', 'Generation Time')}
              </Text>
              <Text fontWeight="semibold" color={valueColor}>
                {generationDuration || '—'}
              </Text>
            </Box>
          </Flex>

          <Divider borderColor={borderColor} />

          <Box>
            <Text fontSize="xs" textTransform="uppercase" color={mutedColor} mb={2}>
              {t('history:ai_model', 'AI Model')}
            </Text>
            {modelLabels.length > 0 ? (
              <Wrap spacing="8px">
                {modelLabels.map((label) => (
                  <WrapItem key={label}>
                    <Tag size="sm" borderRadius="full" bg={chipBg} color={chipText} px={3} py={1}>
                      <TagLabel fontSize="xs" fontWeight="semibold" color={valueColor}>
                        {label}
                      </TagLabel>
                    </Tag>
                  </WrapItem>
                ))}
              </Wrap>
            ) : (
              <Text fontSize="sm" color={valueColor}>
                {t('history:not_available', 'Not available')}
              </Text>
            )}
          </Box>

          <Box>
            <Flex align="center" justify="space-between" mb={2} gap={3}>
              <Text fontSize="xs" textTransform="uppercase" color={mutedColor}>
                {t('generate:prompt', 'Prompt')}
              </Text>
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
                    onClick={onCopyPrompt}
                  />
                </Tooltip>
              )}
            </Flex>
            <Text fontSize="sm" color={valueColor} whiteSpace="pre-line" noOfLines={3}>
              {promptText || t('history:not_available', 'Not available')}
            </Text>
          </Box>

          {settingsEntries.length > 0 && (
            <Box>
              <Text fontSize="xs" textTransform="uppercase" color={mutedColor} mb={2}>
                {t('generate:settings', 'Settings')}
              </Text>
              <Wrap spacing="8px">
                {settingsEntries.map((setting) => (
                  <WrapItem key={setting.key}>
                    <Tag size="sm" borderRadius="full" bg={chipBg} color={chipText} px={3} py={1}>
                      <TagLabel fontSize="xs" display="flex" gap={1} alignItems="center">
                        <Text as="span">{setting.label}:</Text>
                        <Text as="span" fontWeight="semibold" color={valueColor}>
                          {setting.value}
                        </Text>
                      </TagLabel>
                    </Tag>
                  </WrapItem>
                ))}
              </Wrap>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

const HistoryJob: React.FC<JobHistoryProps> = ({
  viewMode = VIEW_OPTIONS.GRID,
  historyJobs = [],
  isPublishMethod,
  isDeleteMethod,
  fetchData,
  getImage,
  onMoveToProject,
}) => {
  const [selectedJobIndex, setSelectedJobIndex] = useState<number | null>(null);
  const [navigationCurrentIndex, setNavigationCurrentIndex] = useState<number>(-1);

  const normalizedHistoryJobs = useMemo(
    () =>
      historyJobs.map((job) => {
        const imagePath = job.path || job.thumbnail || imageUtils.getImageUrl(job.imageKey, false, 'jpg');
        return {
          ...job,
          normalizedImage: {
            key: job.imageKey,
            path: imagePath,
            thumbnail: job.thumbnail,
            dimensions: job.dimensions,
            preloadedBlobUrl: getImage(job.imageKey).blobUrl,
          },
          matchedAttribute: {
            userId: job.userId,
            attributeId: job.jobId || job.imageKey,
            version: job.version,
            value: {
              key: job.imageKey,
              path: imagePath,
              thumbnail: job.thumbnail,
              dimensions: job.dimensions,
            },
            method: job.method,
            actions: job.actions,
            createdAt: job.createdAt,
            isPublished: job.isPublished,
          },
        };
      }),
    [historyJobs, getImage]
  );

  const { currentIndex, handleNext, handlePrev, goToIndex } = useImageNavigation({
    totalImages: normalizedHistoryJobs.length || 0,
    initialIndex: navigationCurrentIndex,
    onIndexChange: (newIndex) => {
      setNavigationCurrentIndex(newIndex);
    },
  });

  const handleImageCardClick = (index: number) => {
    setNavigationCurrentIndex(index);
    goToIndex(index);
  };

  const handleModalClose = () => {
    setNavigationCurrentIndex(-1);
  };

  const historyLightboxItems = useMemo(
    () => normalizedHistoryJobs.map((job) => ({ value: job.normalizedImage })),
    [normalizedHistoryJobs]
  );

  const handleRefresh = React.useCallback(() => {
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
  }, [fetchData]);

  const renderGridView = () => {
    return (
      <div className="layout-columns-3">
        {normalizedHistoryJobs.map((job, index) => (
          <div key={`${job.jobId || job.id || index}`} className="break-inside-avoid">
            <HistoryGridCard
              job={job}
              isPublishMethod={isPublishMethod}
              onRefresh={handleRefresh}
              onMoveToProject={onMoveToProject}
              onImageClick={() => handleImageCardClick(index)}
              allImages={historyLightboxItems}
              currentImageIndex={navigationCurrentIndex === index ? currentIndex : undefined}
              onNavigationNext={handleNext}
              onNavigationPrevious={handlePrev}
              onModalClose={handleModalClose}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderListView = () => (
    <div className="flex flex-col space-y-2.5">
      {historyJobs.map((job, index) => (
        <JobItem
          job={job}
          key={job.id}
          isSelected={selectedJobIndex === index}
          viewMode={viewMode}
          isPublishMethod={isPublishMethod}
          isDeleteMethod={isDeleteMethod}
          onToggle={() => setSelectedJobIndex(selectedJobIndex === index ? null : index)}
          fetchData={fetchData}
          blobUrl={getImage(job.imageKey).blobUrl}
          onMoveToProject={onMoveToProject}
        />
      ))}
    </div>
  );

  return <div className="text-white">{viewMode === VIEW_OPTIONS.GRID ? renderGridView() : renderListView()}</div>;
};

export default HistoryJob;

