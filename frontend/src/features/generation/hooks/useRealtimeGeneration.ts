import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { toApiProblem } from '../api/errors';
import { generationKeys } from '../api/keys';
import { canvasToPngBlob, renderSketch } from '../canvas/export';
import type { CatalogModel, GenerationSnapshot, GenerationResultAsset } from '../contracts';
import { toStudioInput, type DraftStore } from '../draft/draftState';
import { getBrowserStore } from '../draft/browser';
import { writeStoredSession, type StoredSession } from '../draft/storage';
import { validateInput } from '../scheduler/input';
import { createRealtimeScheduler } from '../scheduler/scheduler';
import {
  selectActiveJob,
  selectDisplayed,
  selectFreshness,
  selectIsUpdating,
  selectLatestFailure,
  selectVersions,
} from '../scheduler/selectors';
import type { JobEntry, PreparedInput, RealtimeScheduler, SchedulerPorts, SchedulerState } from '../scheduler/types';
import { useGenerationEvents, type StudioSocket } from './useGenerationEvents';
import type { StudioApi } from './types';
import { usePreviewUrls } from './usePreviewUrls';

export interface VersionView {
  job: JobEntry;
  snapshot: GenerationSnapshot | null;
  asset: GenerationResultAsset | null;
}

export interface RealtimeGeneration {
  scheduler: RealtimeScheduler | null;
  state: SchedulerState | null;
  versions: VersionView[];
  displayed: VersionView | null;
  activeJob: JobEntry | null;
  latestFailure: JobEntry | null;
  freshness: ReturnType<typeof selectFreshness>;
  updating: boolean;
}

interface Args {
  userId: string;
  api: StudioApi;
  session: StoredSession;
  store: DraftStore;
  model: CatalogModel | null;
  connect: () => StudioSocket;
}

const noopSubscribe = () => () => undefined;

function useSchedulerState(scheduler: RealtimeScheduler | null): SchedulerState | null {
  const subscribe = useCallback((listener: () => void) => (scheduler ? scheduler.subscribe(listener) : noopSubscribe()), [scheduler]);
  const getSnapshot = useCallback(() => (scheduler ? scheduler.getState() : null), [scheduler]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Thin React binding for the pure scheduler: wires ports (API, Query cache, sketch export), the draft
 * store, window visibility/online events and the socket, and exposes the scheduler state plus the
 * server-state payloads that TanStack Query owns.
 */
export function useRealtimeGeneration({ userId, api, session, store, model, connect }: Args): RealtimeGeneration {
  const queryClient = useQueryClient();
  const previewUrls = usePreviewUrls();
  const modelRef = useRef(model);
  modelRef.current = model;
  const apiRef = useRef(api);
  apiRef.current = api;
  const [scheduler, setScheduler] = useState<RealtimeScheduler | null>(null);

  useEffect(() => {
    const sketchCache = new Map<string, PreparedInput>();
    const ports: SchedulerPorts = {
      api: {
        createGeneration: (body, key) => apiRef.current.createGeneration(body, key),
        getGeneration: (id) => apiRef.current.getGeneration(id),
        cancelGeneration: (id) => apiRef.current.cancelGeneration(id),
        retryGeneration: (id, key) => apiRef.current.retryGeneration(id, key),
        saveGeneration: (id) => apiRef.current.saveGeneration(id),
        createStudioSession: () => apiRef.current.createStudioSession(),
      },
      classifyError: toApiProblem,
      validate: (input) => validateInput(input, modelRef.current),
      async prepareSketch(sketch, size, context) {
        const cacheKey = `${sketch.version}:${size.width}x${size.height}`;
        const cached = sketchCache.get(cacheKey);
        if (cached) {
          return cached;
        }
        const { canvas, blank } = renderSketch(sketch.strokes, size);
        if (blank) {
          return {}; // a blank canvas is never uploaded
        }
        const blob = await canvasToPngBlob(canvas);
        if (context.signal.aborted) {
          throw new Error('Sketch export was superseded.');
        }
        const upload = await apiRef.current.uploadImage(new File([blob], 'sketch.png', { type: 'image/png' }), context.signal);
        if (context.signal.aborted) {
          throw new Error('Sketch upload was superseded.');
        }
        const prepared: PreparedInput = { inputAssetId: upload.assetId, inputPreviewUrl: previewUrls.create(blob) };
        sketchCache.set(cacheKey, prepared);
        if (sketchCache.size > 4) {
          const oldest = sketchCache.keys().next();
          if (!oldest.done) {
            sketchCache.delete(oldest.value);
          }
        }
        return prepared;
      },
      storeSnapshot: (snapshot) => {
        queryClient.setQueryData(generationKeys.snapshot(userId, snapshot.id), snapshot);
      },
      onTerminal: () => {
        void queryClient.invalidateQueries({ queryKey: generationKeys.balance(userId) });
        void queryClient.invalidateQueries({ queryKey: generationKeys.history(userId) });
      },
      onCreditsProblem: () => {
        void queryClient.invalidateQueries({ queryKey: generationKeys.balance(userId) });
      },
      onSessionRenewed: (renewed) => {
        writeStoredSession(getBrowserStore('session'), userId, { sessionId: renewed.id, latestRevision: renewed.latestRevision, jobs: [] });
      },
    };
    const initial = store.getState();
    const created = createRealtimeScheduler({
      sessionId: session.sessionId,
      initialRevision: session.latestRevision,
      initialInput: toStudioInput(initial),
      initialAuto: initial.auto,
      initialVisible: document.visibilityState !== 'hidden',
      initialOnline: navigator.onLine,
      initialConnection: 'reconnecting',
      ports,
    });
    const unsubscribeStore = store.subscribe(() => created.updateInput(toStudioInput(store.getState())));
    const onVisibility = () => created.setVisible(document.visibilityState !== 'hidden');
    const onOnline = () => created.setOnline(true);
    const onOffline = () => created.setOnline(false);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    created.adoptJobs(session.jobs.map((job) => ({ jobId: job.id, prompt: job.prompt })));
    setScheduler(created);
    return () => {
      unsubscribeStore();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      created.dispose();
      setScheduler(null);
    };
  }, [userId, session.sessionId, session.latestRevision, session.jobs, store, queryClient, previewUrls]);

  useGenerationEvents(scheduler, connect);

  const state = useSchedulerState(scheduler);

  // Persist the session pointer (id, last accepted revision, job ids) so a reload can recover this tab.
  const currentSessionId = state?.sessionId ?? null;
  const lastSubmitted = state?.lastSubmittedRevision ?? 0;
  const trackedJobs = state?.jobs ?? null;
  useEffect(() => {
    if (!currentSessionId || !trackedJobs) {
      return;
    }
    writeStoredSession(getBrowserStore('session'), userId, {
      sessionId: currentSessionId,
      latestRevision: lastSubmitted,
      jobs: trackedJobs.map((job) => ({ id: job.jobId, prompt: job.prompt })),
    });
  }, [userId, currentSessionId, lastSubmitted, trackedJobs]);

  const jobs = state?.jobs ?? [];
  const queries = useQueries({
    queries: jobs.map((job) => ({
      queryKey: generationKeys.snapshot(userId, job.jobId),
      queryFn: () => apiRef.current.getGeneration(job.jobId),
      enabled: false,
      staleTime: Infinity,
    })),
  });
  const snapshots = new Map<string, GenerationSnapshot>();
  jobs.forEach((job, index) => {
    const data = queries[index]?.data;
    if (data) {
      snapshots.set(job.jobId, data);
    }
  });

  const toView = (job: JobEntry): VersionView => {
    const snapshot = snapshots.get(job.jobId) ?? null;
    return { job, snapshot, asset: snapshot?.result?.assets[0] ?? null };
  };

  if (!state) {
    return { scheduler, state, versions: [], displayed: null, activeJob: null, latestFailure: null, freshness: 'none', updating: false };
  }
  const displayedJob = selectDisplayed(state);
  return {
    scheduler,
    state,
    versions: selectVersions(state).map(toView),
    displayed: displayedJob ? toView(displayedJob) : null,
    activeJob: selectActiveJob(state),
    latestFailure: selectLatestFailure(state),
    freshness: selectFreshness(state, displayedJob),
    updating: selectIsUpdating(state),
  };
}
