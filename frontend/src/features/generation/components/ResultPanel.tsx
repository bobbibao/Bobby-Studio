import { Box, Button, Flex, Heading, Skeleton, Text, Wrap, WrapItem } from '@chakra-ui/react';
import { AlertCircle, Ban, BookmarkCheck, BookmarkPlus, CheckCircle2, Clock, Columns2, Copy, Download, Hourglass, Image as ImageIcon, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import type { VersionView } from '../hooks/useRealtimeGeneration';
import type { OutputFreshness } from '../scheduler/selectors';
import type { JobEntry, SavingState } from '../scheduler/types';
import { errorCopy, stageCopy } from './messages';
import { formatDateTime } from './format';
import { SpinIcon } from './SpinIcon';
import { StatusChip } from './StatusChip';
import { focusRing, panelStyle, touchSize } from './styles';
import { useExpired } from './useExpiry';
import { ZoomableImage } from './ZoomableImage';

export interface ResultPanelProps {
  displayed: VersionView | null;
  activeJob: JobEntry | null;
  latestFailure: JobEntry | null;
  freshness: OutputFreshness;
  /** An update for the current input is pending, running or being submitted. */
  updating: boolean;
  saving: SavingState | null;
  onSave(jobId: string): void;
  onRetry(jobId: string): void;
  onRegenerate(): void;
  /** Re-reads the snapshot (fresh signed URL) after an image failed to load. */
  onRefresh(jobId: string): void;
  onDownload(version: VersionView): Promise<void>;
}

export function ResultPanel({ displayed, activeJob, latestFailure, freshness, updating, saving, onSave, onRetry, onRegenerate, onRefresh, onDownload }: ResultPanelProps) {
  const { t, i18n } = useTranslation('studio');
  const [compare, setCompare] = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const failures = useRef(new Map<string, number>());
  const [failedJobs, setFailedJobs] = useState<ReadonlySet<string>>(new Set());

  const asset = displayed?.asset ?? null;
  const snapshot = displayed?.snapshot ?? null;
  const job = displayed?.job ?? null;
  const saved = Boolean(asset?.saved);
  const retentionExpired = useExpired(snapshot?.expiresAt ?? null, saved);
  const expired = Boolean(job && (retentionExpired || failedJobs.has(job.jobId) || (job.status === 'COMPLETED' && job.hasResult === false)));
  const compareUrl = job?.inputPreviewUrl ?? null;
  const isSaving = saving?.status === 'saving' && saving.jobId === job?.jobId;
  const saveFailed = saving?.status === 'error' && saving.jobId === job?.jobId;

  // Leaving a version also leaves its compare view and any transient messages.
  useEffect(() => {
    setCompare(false);
    setDownloadState('idle');
    setCopied(false);
  }, [job?.jobId]);

  const handleImageError = () => {
    if (!job) {
      return;
    }
    const count = (failures.current.get(job.jobId) ?? 0) + 1;
    failures.current.set(job.jobId, count);
    if (count === 1) {
      onRefresh(job.jobId); // the signed URL may simply have expired
    } else {
      setFailedJobs((current) => new Set(current).add(job.jobId));
    }
  };

  const copyPrompt = async () => {
    if (!job?.prompt) {
      return;
    }
    try {
      await navigator.clipboard.writeText(job.prompt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const download = async () => {
    if (!displayed) {
      return;
    }
    setDownloadState('busy');
    try {
      await onDownload(displayed);
      setDownloadState('idle');
    } catch {
      setDownloadState('error');
    }
  };

  const showImage = Boolean(displayed && asset && !expired);
  const alt = job?.prompt ? t('result.alt_prompt', { prompt: job.prompt.slice(0, 120) }) : t('result.alt');
  const jobRunning = Boolean(activeJob);

  return (
    <Flex direction="column" gap={3} {...panelStyle} p={{ base: 3, md: 4 }} minW={0} h="100%" aria-busy={updating}>
      <Flex align="center" justify="space-between" gap={2} wrap="wrap">
        <Heading as="h2" size="sm" fontWeight="semibold">
          {t('result.title')}
        </Heading>
        <Wrap spacing={2} justify="flex-end">
          {job ? (
            <WrapItem>
              <StatusChip tone="neutral">{job.intent === 'final' ? t('result.final') : t('result.preview')}</StatusChip>
            </WrapItem>
          ) : null}
          {job && job.isSimulated ? (
            <WrapItem>
              <StatusChip tone="info" icon={<Sparkles size={12} aria-hidden="true" />}>
                {t('settings.simulated')}
              </StatusChip>
            </WrapItem>
          ) : null}
          {showImage ? (
            <WrapItem>
              {saved ? (
                <StatusChip tone="success" icon={<BookmarkCheck size={12} aria-hidden="true" />}>
                  {t('result.saved')}
                </StatusChip>
              ) : (
                <StatusChip tone="warning" icon={<Clock size={12} aria-hidden="true" />}>
                  {t('result.unsaved')}
                </StatusChip>
              )}
            </WrapItem>
          ) : null}
          {updating && showImage ? (
            <WrapItem>
              <StatusChip tone="info" icon={<SpinIcon size={12} />}>
                {t('result.updating')}
              </StatusChip>
            </WrapItem>
          ) : null}
          {!updating && showImage && freshness === 'stale' ? (
            <WrapItem>
              <StatusChip tone="neutral" icon={<Hourglass size={12} aria-hidden="true" />}>
                {t('result.input_changed')}
              </StatusChip>
            </WrapItem>
          ) : null}
        </Wrap>
      </Flex>

      {latestFailure && !jobRunning ? (
        <Flex
          role="status"
          align="flex-start"
          gap={2}
          p={3}
          borderRadius="10px"
          borderWidth="1px"
          borderColor={latestFailure.status === 'FAILED' ? 'red.300' : 'border.default'}
          bg="bg.subtle"
        >
          {latestFailure.status === 'FAILED' ? <AlertCircle size={18} aria-hidden="true" /> : <Ban size={18} aria-hidden="true" />}
          <Box flex="1" minW={0}>
            <Text fontSize="sm" fontWeight="semibold">
              {latestFailure.status === 'FAILED' ? t('result.failed') : t('result.cancelled')}
            </Text>
            <Text fontSize="sm" color="text.muted">
              {latestFailure.status === 'FAILED'
                ? errorCopy(t, latestFailure.error?.code ?? null)
                : showImage
                  ? t('result.cancelled_keep')
                  : t('result.cancelled_body')}
            </Text>
          </Box>
          <Button size="sm" variant="outline" leftIcon={<RefreshCw size={14} aria-hidden="true" />} h={touchSize} onClick={() => onRetry(latestFailure.jobId)} _focusVisible={focusRing}>
            {t('actions.retry')}
          </Button>
        </Flex>
      ) : null}

      <Box flex="1" minH={0}>
        {showImage && asset ? (
          compare && compareUrl ? (
            <Box minH={{ base: '240px', md: '300px' }} bg="bg.muted" borderRadius="12px" overflow="hidden" display="flex" alignItems="center" justifyContent="center">
              <ReactCompareSlider
                style={{ width: '100%', maxHeight: 520 }}
                itemOne={<ReactCompareSliderImage src={compareUrl} alt={t('result.compare_input')} style={{ objectFit: 'contain' }} />}
                itemTwo={<ReactCompareSliderImage src={asset.url} alt={alt} style={{ objectFit: 'contain' }} onError={handleImageError} />}
              />
            </Box>
          ) : (
            <ZoomableImage
              key={job?.jobId}
              src={asset.url}
              alt={alt}
              width={asset.width}
              height={asset.height}
              dimmed={updating}
              onError={handleImageError}
            />
          )
        ) : expired ? (
          <Flex direction="column" align="center" justify="center" textAlign="center" gap={3} minH={{ base: '240px', md: '300px' }} bg="bg.muted" borderRadius="12px" p={4} role="status">
            <Clock size={32} aria-hidden="true" />
            <Text fontWeight="semibold">{t('result.expired_title')}</Text>
            <Text fontSize="sm" color="text.muted" maxW="320px">
              {t('result.expired_body')}
            </Text>
            <Button variant="primary" h={touchSize} leftIcon={<RefreshCw size={16} aria-hidden="true" />} onClick={onRegenerate} _focusVisible={focusRing}>
              {t('result.regenerate')}
            </Button>
          </Flex>
        ) : displayed && !snapshot ? (
          <Skeleton minH={{ base: '240px', md: '300px' }} h="100%" borderRadius="12px" />
        ) : jobRunning ? (
          <Flex direction="column" gap={3} minH={{ base: '240px', md: '300px' }} justify="center" align="center" bg="bg.muted" borderRadius="12px" p={4}>
            <Skeleton w="60%" h="120px" borderRadius="10px" />
            <Flex align="center" gap={2}>
              <SpinIcon />
              <Text fontSize="sm" fontWeight="medium">
                {activeJob ? stageCopy(t, activeJob) : t('result.working')}
              </Text>
            </Flex>
          </Flex>
        ) : (
          <Flex direction="column" align="center" justify="center" textAlign="center" gap={2} minH={{ base: '240px', md: '300px' }} bg="bg.muted" borderRadius="12px" p={4} color="text.muted">
            <ImageIcon size={32} aria-hidden="true" />
            <Text fontWeight="semibold" color="text.primary">
              {t('result.empty_title')}
            </Text>
            <Text fontSize="sm" maxW="300px">
              {t('result.empty_body')}
            </Text>
          </Flex>
        )}
      </Box>

      {jobRunning && showImage && activeJob ? (
        <Text fontSize="xs" color="text.muted" aria-hidden="true">
          {stageCopy(t, activeJob)}
        </Text>
      ) : null}

      <Wrap spacing={2}>
        <WrapItem>
          <Button
            size="sm"
            variant="outline"
            h={touchSize}
            isDisabled={!showImage || saved || isSaving}
            leftIcon={saved ? <CheckCircle2 size={14} aria-hidden="true" /> : isSaving ? <SpinIcon size={14} /> : <BookmarkPlus size={14} aria-hidden="true" />}
            onClick={() => job && onSave(job.jobId)}
            _focusVisible={focusRing}
          >
            {saved ? t('result.saved') : isSaving ? t('result.saving') : t('actions.save')}
          </Button>
        </WrapItem>
        <WrapItem>
          <Button
            size="sm"
            variant="outline"
            h={touchSize}
            isDisabled={!showImage || downloadState === 'busy'}
            leftIcon={downloadState === 'busy' ? <SpinIcon size={14} /> : <Download size={14} aria-hidden="true" />}
            onClick={download}
            _focusVisible={focusRing}
          >
            {t('actions.download')}
          </Button>
        </WrapItem>
        <WrapItem>
          <Button
            size="sm"
            variant="outline"
            h={touchSize}
            isDisabled={!showImage || !compareUrl}
            aria-pressed={compare}
            leftIcon={<Columns2 size={14} aria-hidden="true" />}
            onClick={() => setCompare((value) => !value)}
            _focusVisible={focusRing}
          >
            {t('actions.compare')}
          </Button>
        </WrapItem>
        <WrapItem>
          <Button size="sm" variant="outline" h={touchSize} isDisabled={!job?.prompt} leftIcon={<Copy size={14} aria-hidden="true" />} onClick={copyPrompt} _focusVisible={focusRing}>
            {t('actions.copy_prompt')}
          </Button>
        </WrapItem>
      </Wrap>

      <Box role="status" aria-live="polite" minH="1.25rem">
        {saveFailed ? <Text fontSize="xs" color="red.500">{t('result.save_failed')}</Text> : null}
        {downloadState === 'error' ? <Text fontSize="xs" color="red.500">{t('result.download_failed')}</Text> : null}
        {copied ? <Text fontSize="xs" color="text.muted">{t('result.copied')}</Text> : null}
      </Box>

      {snapshot ? (
        <Text fontSize="xs" color="text.muted">
          {t('result.meta', { date: formatDateTime(snapshot.completedAt ?? snapshot.createdAt, i18n.language), width: asset?.width ?? snapshot.size.width, height: asset?.height ?? snapshot.size.height })}
        </Text>
      ) : null}
    </Flex>
  );
}
