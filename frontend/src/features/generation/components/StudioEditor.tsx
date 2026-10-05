import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Grid,
  Heading,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
  type StackProps,
} from '@chakra-ui/react';
import { Coins, SlidersHorizontal } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { isStrokeLimitReached, canRedo, canUndo } from '../canvas/strokes';
import type { StrokeInput } from '../canvas/types';
import type { CatalogResponse, CreditBalance } from '../contracts';
import { useDraftPersistence, useDraftState, useDraftStore, useEnsureModel } from '../hooks/useDraftStore';
import type { StudioApi } from '../hooks/types';
import type { StudioSocket } from '../hooks/useGenerationEvents';
import { useRealtimeGeneration, type VersionView } from '../hooks/useRealtimeGeneration';
import { REFERENCE_MAX_BYTES } from '../hooks/referenceFile';
import { useReferenceUpload } from '../hooks/useReferenceUpload';
import { usePreviewUrls } from '../hooks/usePreviewUrls';
import type { StoredSession } from '../draft/storage';
import { MAX_PROMPT_CHARS } from '../scheduler/input';
import { ConnectionBadge } from './ConnectionBadge';
import { downloadFileName, formatNumber } from './format';
import { GenerateActions } from './GenerateActions';
import { InputPanel } from './InputPanel';
import { autoPauseCopy, inputIssueCopy, problemCopy, stageCopy } from './messages';
import { PromptField } from './PromptField';
import { RealtimeSwitch } from './RealtimeSwitch';
import { ResultPanel } from './ResultPanel';
import { SettingsFields } from './SettingsFields';
import { StatusChip } from './StatusChip';
import { StatusLine, type StatusLineProps } from './StatusLine';
import { focusRing, panelStyle, touchSize } from './styles';
import { useCountdown } from './useCountdown';
import { VersionStrip } from './VersionStrip';
import { useViewportTier } from '../hooks/useViewportTier';

export interface StudioEditorProps {
  userId: string;
  api: StudioApi;
  connect: () => StudioSocket;
  /** Fetches a (signed) result URL as a Blob for download. */
  fetchImage: (url: string) => Promise<Blob>;
  session: StoredSession;
  catalog: CatalogResponse;
  balance: CreditBalance | null;
}

const panelProps: StackProps = { ...panelStyle, p: 4 };

/** The studio workspace: draft store, scheduler binding and the responsive layout. */
export function StudioEditor({ userId, api, connect, fetchImage, session, catalog, balance }: StudioEditorProps) {
  const { t, i18n } = useTranslation('studio');
  const tier = useViewportTier();
  const store = useDraftStore(userId, session.sessionId);
  const draft = useDraftState(store);
  const models = catalog.models;
  const model = models.find((candidate) => candidate.id === draft.modelId) ?? null;
  useEnsureModel(store, models);
  const previewUrls = usePreviewUrls();
  const rt = useRealtimeGeneration({ userId, api, session, store, model, connect });
  const scheduler = rt.scheduler;
  const state = rt.state;
  useDraftPersistence(store, userId, state?.sessionId ?? session.sessionId);
  const reference = useReferenceUpload(store, api, previewUrls, {
    maxBytes: model?.limits.maxInputImageBytes,
    mimeTypes: model?.limits.inputMimeTypes,
  });
  const settings = useDisclosure();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [mobileTab, setMobileTab] = useState(0);
  const [seenJobId, setSeenJobId] = useState<string | null>(null);

  const maxChars = Math.min(MAX_PROMPT_CHARS, model?.limits.maxPromptChars ?? MAX_PROMPT_CHARS);
  const aspect = draft.size ? draft.size.width / draft.size.height : 1;
  const previewCredits = model ? model.creditEstimate[draft.quality] : null;

  const setAuto = useCallback(
    (on: boolean) => {
      store.dispatch({ type: 'auto', value: on });
      scheduler?.setAuto(on);
    },
    [scheduler, store]
  );
  const generate = useCallback(() => {
    scheduler?.generate();
    setMobileTab(1);
  }, [scheduler]);
  const stop = useCallback(() => scheduler?.stop(), [scheduler]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      generate();
    }
  };

  const onDownload = useCallback(
    async (version: VersionView) => {
      if (!version.asset) {
        return;
      }
      const blob = await fetchImage(version.asset.url);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFileName(version.job.prompt, version.asset.mimeType, version.snapshot?.completedAt ?? null);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
    [fetchImage]
  );

  const throttleSeconds = useCountdown(state?.throttleUntil ?? null);
  const balanceText = balance ? formatNumber(balance.available, i18n.language) : undefined;

  const { announcement, notices } = useMemo<StatusLineProps>(() => {
    const list: StatusLineProps['notices'] = [];
    let message = '';
    if (!state) {
      return { announcement: '', notices: list };
    }
    if (state.problem) {
      const copy = problemCopy(t, state.problem, { balance: balanceText, seconds: throttleSeconds });
      list.push({
        key: 'problem',
        tone: state.problem.kind === 'rate_limited' || state.problem.kind === 'invalid' ? 'warning' : 'danger',
        kind: state.problem.kind === 'credits' ? 'credits' : state.problem.kind === 'rate_limited' ? 'throttle' : 'problem',
        text: copy.text,
      });
      message = state.problem.kind === 'rate_limited' ? t('errors.rate_limited_short') : copy.text;
    }
    if (state.autoPause) {
      const text = autoPauseCopy(t, state.autoPause);
      list.push({
        key: 'paused',
        tone: 'warning',
        kind: 'paused',
        text: (
          <>
            {text}{' '}
            <Button size="xs" variant="link" onClick={() => setAuto(true)}>
              {t('realtime.resume')}
            </Button>
          </>
        ),
      });
      message = message || text;
    }
    if (!message) {
      if (!state.online) {
        message = t('connection.offline');
      } else if (state.connection === 'reconnecting') {
        message = t('connection.reconnecting');
      } else if (rt.activeJob) {
        message = stageCopy(t, rt.activeJob);
      } else if (rt.latestFailure) {
        message = rt.latestFailure.status === 'FAILED' ? t('result.failed') : t('result.cancelled');
      } else if (rt.versions.length > 0) {
        message = t('result.ready', { count: rt.versions.length });
      }
    }
    return { announcement: message, notices: list };
  }, [state, rt.activeJob, rt.latestFailure, rt.versions.length, t, balanceText, throttleSeconds, setAuto]);

  const sketchProps = {
    strokes: draft.history.strokes,
    aspect,
    canUndo: canUndo(draft.history),
    canRedo: canRedo(draft.history),
    limitReached: isStrokeLimitReached(draft.history),
    onStroke: (stroke: StrokeInput) => store.dispatch({ type: 'stroke', stroke }),
    onUndo: () => store.dispatch({ type: 'undo' }),
    onRedo: () => store.dispatch({ type: 'redo' }),
    onClear: () => store.dispatch({ type: 'clear' }),
    onDrawingChange: (active: boolean) => scheduler?.setDrawing(active),
  };

  const inputPanel = (
    <InputPanel
      mode={draft.mode}
      onMode={(mode) => store.dispatch({ type: 'mode', value: mode })}
      sketch={sketchProps}
      reference={draft.reference}
      referenceIssue={reference.issue}
      referenceMaxBytes={Math.min(REFERENCE_MAX_BYTES, model?.limits.maxInputImageBytes ?? REFERENCE_MAX_BYTES)}
      onPickReference={reference.pick}
      onRemoveReference={reference.remove}
      onExample={(prompt) => {
        store.dispatch({ type: 'prompt', value: prompt });
        promptRef.current?.focus();
      }}
    />
  );

  const fieldErrors = state?.problem?.kind === 'rejected' ? state.problem.fieldErrors : undefined;
  const promptField = (
    <PromptField
      value={draft.prompt}
      maxChars={maxChars}
      inputRef={promptRef}
      rows={tier === 'desktop' ? 7 : 4}
      onChange={(value) => store.dispatch({ type: 'prompt', value })}
      onCompositionStart={() => scheduler?.compositionStart()}
      onCompositionEnd={(value) => scheduler?.compositionEnd(value)}
      error={fieldErrors?.find((entry) => entry.field === 'prompt')?.message}
    />
  );

  const settingsFields = (idPrefix: string) => (
    <SettingsFields
      idPrefix={idPrefix}
      models={models}
      model={model}
      size={draft.size}
      quality={draft.quality}
      onModel={(modelId) => {
        const next = models.find((candidate) => candidate.id === modelId);
        if (next) {
          store.dispatch({ type: 'model', model: next });
        }
      }}
      onSize={(size) => store.dispatch({ type: 'size', value: size })}
      onQuality={(quality) => store.dispatch({ type: 'quality', value: quality })}
      fieldErrors={fieldErrors}
    />
  );

  const issue = state?.inputIssue ?? null;
  const generating = Boolean(state?.finalActive);
  const actions = (block?: boolean) => (
    <GenerateActions
      onGenerate={generate}
      onStop={stop}
      generateDisabled={!state || issue !== null || generating}
      generating={generating}
      stoppable={Boolean(state?.stoppable)}
      block={block}
    />
  );
  const realtime = (
    <RealtimeSwitch
      checked={draft.auto}
      onChange={setAuto}
      creditsPerPreview={previewCredits}
      paused={state?.autoPause ? t('realtime.paused_short') : null}
      disabled={!state}
    />
  );
  const issueHint = issue ? (
    <Text fontSize="xs" color="text.muted">
      {inputIssueCopy(t, issue)}
    </Text>
  ) : null;

  const result = (
    <ResultPanel
      displayed={rt.displayed}
      activeJob={rt.activeJob}
      latestFailure={rt.latestFailure}
      freshness={rt.freshness}
      updating={rt.updating}
      saving={state?.saving ?? null}
      onSave={(jobId) => void scheduler?.save(jobId)}
      onRetry={(jobId) => scheduler?.retry(jobId)}
      onRegenerate={generate}
      onRefresh={(jobId) => void scheduler?.refreshJob(jobId)}
      onDownload={onDownload}
    />
  );
  const strip = <VersionStrip versions={rt.versions} selectedJobId={rt.displayed?.job.jobId ?? null} onSelect={(jobId) => scheduler?.select(jobId)} />;

  const header = (
    <Flex align="center" justify="space-between" gap={3} wrap="wrap">
      <Heading as="h1" size="lg" fontWeight="semibold" fontSize="24px">
        {t('title')}
      </Heading>
      <Flex align="center" gap={2} wrap="wrap">
        <ConnectionBadge connection={state?.connection ?? 'reconnecting'} online={state?.online ?? true} />
        {balance ? (
          <StatusChip tone="neutral" icon={<Coins size={12} aria-hidden="true" />}>
            {t('header.credits', { count: balance.available, formatted: formatNumber(balance.available, i18n.language) })}
          </StatusChip>
        ) : null}
      </Flex>
    </Flex>
  );

  let body: JSX.Element;
  if (tier === 'desktop') {
    body = (
      <Grid templateColumns="280px minmax(0, 1fr)" gap={4} alignItems="start">
        <Stack as="aside" aria-label={t('panel.aria')} spacing={4} {...panelProps} position="sticky" top={0}>
          {promptField}
          {settingsFields('studio')}
          {actions(true)}
          {issueHint}
        </Stack>
        <Stack spacing={4} minW={0}>
          <Flex justify="flex-end">{realtime}</Flex>
          <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={4} alignItems="stretch">
            <Box {...panelStyle} p={4} minW={0}>
              {inputPanel}
            </Box>
            {result}
          </Grid>
          {strip}
        </Stack>
      </Grid>
    );
  } else if (tier === 'tablet') {
    body = (
      <Stack spacing={3}>
        <Stack {...panelProps} spacing={3}>
          {promptField}
          <Flex align="center" gap={3} wrap="wrap">
            <Button variant="outline" h={touchSize} leftIcon={<SlidersHorizontal size={16} aria-hidden="true" />} onClick={settings.onOpen} aria-haspopup="dialog" _focusVisible={focusRing}>
              {t('settings.open')}
            </Button>
            {actions()}
            <Box ms="auto">{realtime}</Box>
          </Flex>
          {issueHint}
        </Stack>
        <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={3} alignItems="stretch">
          <Box {...panelStyle} p={3} minW={0}>
            {inputPanel}
          </Box>
          {result}
        </Grid>
        {strip}
        <Drawer isOpen={settings.isOpen} placement="end" onClose={settings.onClose} size="sm">
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton aria-label={t('common.close')} />
            <DrawerHeader>{t('settings.title')}</DrawerHeader>
            <DrawerBody>{settingsFields('studio-drawer')}</DrawerBody>
          </DrawerContent>
        </Drawer>
      </Stack>
    );
  } else {
    const hasNew = rt.displayed !== null && rt.displayed.job.jobId !== seenJobId && mobileTab === 0;
    body = (
      <Box>
        <Tabs
          index={mobileTab}
          onChange={(index) => {
            setMobileTab(index);
            if (index === 1) {
              setSeenJobId(rt.displayed?.job.jobId ?? null);
            }
          }}
          isFitted
          variant="enclosed"
          isLazy
          lazyBehavior="keepMounted"
        >
          <TabList>
            <Tab h={touchSize}>{t('mobile.input')}</Tab>
            <Tab h={touchSize} gap={2}>
              {t('mobile.result')}
              {hasNew || rt.updating ? <Text as="span" fontSize="xs" fontWeight="semibold">{rt.updating ? t('mobile.updating_badge') : t('mobile.new_badge')}</Text> : null}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0}>
              <Stack spacing={4}>
                {promptField}
                <Accordion allowToggle>
                  <AccordionItem borderRadius="12px" borderWidth="1px" borderColor="border.default">
                    <AccordionButton h={touchSize}>
                      <Box flex="1" textAlign="start" fontWeight="semibold" fontSize="sm">
                        {t('settings.title')}
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel>{settingsFields('studio')}</AccordionPanel>
                  </AccordionItem>
                </Accordion>
                <Box {...panelStyle} p={3}>
                  {inputPanel}
                </Box>
              </Stack>
            </TabPanel>
            <TabPanel px={0}>
              <Stack spacing={3}>
                {result}
                {strip}
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
        <Stack position="sticky" bottom={0} zIndex={5} bg="bg.surface" borderTopWidth="1px" borderColor="border.default" mx={-3} px={3} py={2} spacing={1} mt={3}>
          <Flex align="center" justify="space-between" gap={2} wrap="wrap">
            {realtime}
          </Flex>
          {actions(true)}
          {issueHint}
        </Stack>
      </Box>
    );
  }

  return (
    <Flex direction="column" gap={3} p={{ base: 3, md: 4 }} maxW="1680px" mx="auto" minH="100%" onKeyDown={onKeyDown} data-testid="studio-editor" role="region" aria-label={t('title')}>
      {header}
      <StatusLine announcement={announcement} notices={notices} />
      {body}
    </Flex>
  );
}
