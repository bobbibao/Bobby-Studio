import { v4 as uuidv4 } from 'uuid';
import type {
  CreateGenerationRequest,
  GenerationAccepted,
  GenerationIntent,
  GenerationSnapshot,
  GenerationUpdatedEvent,
} from '../contracts';
import { hasInk } from '../canvas/strokes';
import { pollDelayMs, QUIET_SIGNAL_MS, replayDelayMs } from './backoff';
import { buildCreateRequest, requestFingerprint, sameInput } from './input';
import { classifyHint, isNonterminal, mergeAccepted, mergeSnapshot, pruneJobs, touchSignal, type AcceptedExtras } from './jobs';
import type {
  AdoptedJob,
  ApiProblem,
  AutoPause,
  ConnectionState,
  InputIssueCode,
  JobEntry,
  PreparedInput,
  RealtimeScheduler,
  SavingState,
  SchedulerOptions,
  SchedulerState,
  StudioInput,
  SubmitProblem,
} from './types';

type Timer = ReturnType<typeof setTimeout>;

interface Pipeline {
  intent: GenerationIntent;
  revision: number | null;
  controller: AbortController;
  /** Preview whose job must be cancelled as soon as the server accepts it (auto turned off / Stop). */
  cancelOnAccept: boolean;
  stopped: boolean;
}

interface Unresolved {
  key: string;
  fingerprint: string;
  body: CreateGenerationRequest;
  intent: GenerationIntent;
  prepared: PreparedInput;
}

type PostOutcome = { accepted: GenerationAccepted } | { problem: ApiProblem } | { dropped: true };

const LIVE_OR_DONE: readonly string[] = ['PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED'];

const mergeIntent = (current: GenerationIntent | null, next: GenerationIntent): GenerationIntent =>
  current === 'final' || next === 'final' ? 'final' : 'preview';

/**
 * Framework-independent realtime scheduler (contracts section 4). All side effects go through ports;
 * every asynchronous step carries the revision/session/job identity it started with and is dropped when
 * that identity is no longer current.
 */
export function createRealtimeScheduler(options: SchedulerOptions): RealtimeScheduler {
  const { ports } = options;
  const debounceMs = options.debounceMs ?? 700;
  const maxReplays = options.maxReplays ?? 3;
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? Math.random;
  const newKey = options.newIdempotencyKey ?? (() => uuidv4());

  let sessionId = options.sessionId;
  let revision = options.initialRevision;
  let lastSubmittedRevision = options.initialRevision;
  let lastAttemptedRevision = options.initialRevision;
  let input: StudioInput = options.initialInput;
  let heldPrompt: string | null = null;
  let composing = false;
  let drawing = false;
  let gateWait = false;
  let auto = options.initialAuto ?? false;
  let autoPause: AutoPause | null = null;
  let visible = options.initialVisible ?? true;
  let online = options.initialOnline ?? true;
  let connection: ConnectionState = options.initialConnection ?? 'connected';
  let jobs: JobEntry[] = [];
  let selectedJobId: string | null = null;
  let problem: SubmitProblem | null = null;
  let throttleUntil: number | null = null;
  let saving: SavingState | null = null;
  let pipeline: Pipeline | null = null;
  let queued: GenerationIntent | null = null;
  let unresolved: Unresolved | null = null;
  let renewedAtRevision: number | null = null;
  let conflictRetried = false;
  let pollAttempt = 0;
  let debounceTimer: Timer | null = null;
  let throttleTimer: Timer | null = null;
  let pollTimer: Timer | null = null;
  let disposed = false;
  const sleepers = new Set<() => void>();
  const fetches = new Map<string, { again: boolean; promise: Promise<void> }>();
  const cancelling = new Set<string>();
  const cancelWanted = new Set<string>();
  const retrying = new Set<string>();
  const listeners = new Set<() => void>();

  // ------------------------------------------------------------------ derived values

  const validateNow = (candidate: StudioInput = input): InputIssueCode | null => ports.validate(candidate);

  const finalActive = (): boolean =>
    pipeline?.intent === 'final' ||
    queued === 'final' ||
    jobs.some((job) => job.intent === 'final' && isNonterminal(job));

  const autoEffective = (): boolean =>
    auto && autoPause === null && visible && online && !disposed && !finalActive();

  const throttleActive = (): boolean => throttleUntil !== null && now() < throttleUntil;

  const hasCurrentJob = (): boolean =>
    pipeline?.revision === revision ||
    jobs.some((job) => job.revision === revision && LIVE_OR_DONE.includes(job.status));

  function buildState(): SchedulerState {
    return {
      sessionId,
      revision,
      lastSubmittedRevision,
      auto,
      autoPause,
      visible,
      online,
      connection,
      composing,
      drawing,
      waiting: debounceTimer !== null || queued !== null || gateWait,
      submitting: pipeline !== null,
      stoppable: pipeline !== null || queued !== null || jobs.some(isNonterminal),
      finalActive: finalActive(),
      throttleUntil: throttleActive() ? throttleUntil : null,
      problem,
      inputIssue: validateNow(),
      jobs,
      selectedJobId,
      saving,
    };
  }

  let state = buildState();

  function publish(): void {
    if (disposed) {
      return;
    }
    state = buildState();
    for (const listener of Array.from(listeners)) {
      listener();
    }
  }

  // ------------------------------------------------------------------ timers

  function clearDebounce(): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function armDebounce(): void {
    clearDebounce();
    gateWait = false;
    debounceTimer = setTimeout(onDebounce, debounceMs);
  }

  function sleep(ms: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        sleepers.delete(wake);
        resolve(true);
      }, ms);
      const wake = () => {
        clearTimeout(timer);
        resolve(false);
      };
      sleepers.add(wake);
    });
  }

  // ------------------------------------------------------------------ input

  function commit(patch: Partial<StudioInput>): void {
    const next: StudioInput = { ...input, ...patch };
    if (sameInput(next, input)) {
      return;
    }
    input = next;
    revision += 1; // before any asynchronous work
    pipeline?.controller.abort();
    if (problem && (problem.kind === 'invalid' || problem.kind === 'rejected' || problem.kind === 'prepare')) {
      problem = null;
    }
    if (autoEffective()) {
      armDebounce();
    }
    publish();
  }

  function updateInput(patch: Partial<StudioInput>): void {
    if (disposed) {
      return;
    }
    if (composing && patch.prompt !== undefined) {
      heldPrompt = patch.prompt;
      const rest: Partial<StudioInput> = { ...patch };
      delete rest.prompt;
      commit(rest);
      return;
    }
    commit(patch);
  }

  function releaseGate(): void {
    if (composing || drawing) {
      return;
    }
    if (gateWait && debounceTimer === null && autoEffective()) {
      armDebounce();
    }
  }

  // ------------------------------------------------------------------ auto scheduling

  function onDebounce(): void {
    debounceTimer = null;
    if (disposed) {
      return;
    }
    if (!autoEffective()) {
      publish();
      return;
    }
    if (composing || drawing) {
      gateWait = true; // wait for compositionend / stroke commit
      publish();
      return;
    }
    requestPreview();
  }

  function requestPreview(): void {
    if (validateNow() !== null || hasCurrentJob()) {
      publish();
      return;
    }
    submit('preview');
  }

  /** After gates open or an action ends: schedule the latest valid change once, never a loop. */
  function catchUp(): void {
    if (!autoEffective() || debounceTimer !== null || pipeline || queued || throttleActive()) {
      return;
    }
    if (revision > lastAttemptedRevision && validateNow() === null && !hasCurrentJob()) {
      armDebounce();
      publish();
    }
  }

  function drain(): void {
    if (disposed || pipeline) {
      return;
    }
    if (queued !== null) {
      const intent = queued;
      if (throttleActive()) {
        return;
      }
      queued = null;
      if (intent === 'final' || autoEffective()) {
        void runOnce(intent);
        return;
      }
    }
    catchUp();
  }

  // ------------------------------------------------------------------ submission pipeline

  function submit(intent: GenerationIntent): void {
    if (disposed) {
      return;
    }
    if (pipeline || throttleActive()) {
      queued = mergeIntent(queued, intent); // coalesce: one in flight + one latest unsent
      if (intent === 'final' && pipeline && pipeline.intent === 'preview') {
        pipeline.controller.abort();
      }
      publish();
      return;
    }
    void runOnce(intent);
  }

  async function prepare(snapshot: StudioInput, rev: number, signal: AbortSignal): Promise<PreparedInput> {
    if (snapshot.mode === 'reference' && snapshot.reference?.assetId) {
      return { inputAssetId: snapshot.reference.assetId, inputPreviewUrl: snapshot.reference.previewUrl ?? null };
    }
    if (snapshot.mode === 'sketch' && snapshot.size && hasInk(snapshot.sketch.strokes)) {
      return ports.prepareSketch(snapshot.sketch, snapshot.size, { revision: rev, signal });
    }
    return {};
  }

  async function runOnce(firstIntent: GenerationIntent): Promise<void> {
    const intent = firstIntent;
    const current: Pipeline = {
      intent,
      revision: null,
      controller: new AbortController(),
      cancelOnAccept: false,
      stopped: false,
    };
    pipeline = current;
    publish();
    try {
      for (;;) {
        const rev = revision;
        const snapshot = input;
        current.revision = rev;
        current.controller = new AbortController();
        lastAttemptedRevision = Math.max(lastAttemptedRevision, rev);
        const issue = validateNow(snapshot);
        if (issue) {
          if (intent === 'final') {
            problem = { kind: 'invalid', issue };
          }
          return;
        }
        let prepared: PreparedInput;
        try {
          prepared = await prepare(snapshot, rev, current.controller.signal);
        } catch {
          if (disposed) {
            return;
          }
          if (current.stopped || current.cancelOnAccept) {
            return;
          }
          if (rev !== revision) {
            if (intent === 'final') {
              continue; // the user asked for the current input: restart with it
            }
            return;
          }
          if (current.controller.signal.aborted) {
            return;
          }
          problem = { kind: 'prepare' };
          return;
        }
        if (disposed || current.stopped) {
          return;
        }
        if (intent === 'preview' && current.controller.signal.aborted) {
          return; // superseded by input, a queued final, Stop or auto off: never submit it
        }
        if (rev !== revision) {
          // Late export/upload for superseded input: never submit it.
          if (intent === 'final' && !current.cancelOnAccept) {
            continue;
          }
          return;
        }
        const body = buildCreateRequest({ sessionId, revision: rev, intent, input: snapshot, prepared });
        const outcome = await postWithReplay(body, intent, prepared);
        if (disposed) {
          return;
        }
        if ('accepted' in outcome) {
          handleAccepted(outcome.accepted, snapshot.prompt.trim(), prepared, current);
        } else if ('problem' in outcome) {
          handleSubmitProblem(outcome.problem, intent, rev);
        }
        return;
      }
    } finally {
      if (pipeline === current) {
        pipeline = null;
      }
      if (!disposed) {
        publish();
        drain();
      }
    }
  }

  /** A lost or timed-out POST is replayed with the SAME idempotency key to recover the accepted job. */
  async function postWithReplay(body: CreateGenerationRequest, intent: GenerationIntent, prepared: PreparedInput): Promise<PostOutcome> {
    const fingerprint = requestFingerprint(body);
    let key: string;
    if (unresolved && unresolved.fingerprint === fingerprint) {
      key = unresolved.key;
    } else {
      key = newKey();
      unresolved = { key, fingerprint, body, intent, prepared };
    }
    for (let attempt = 0; ; attempt += 1) {
      try {
        const accepted = await ports.api.createGeneration(body, key);
        unresolved = null;
        return { accepted };
      } catch (error) {
        if (disposed) {
          return { dropped: true };
        }
        const classified = ports.classifyError(error);
        if ((classified.kind === 'network' || classified.kind === 'server') && attempt < maxReplays) {
          const stillHere = await sleep(replayDelayMs(attempt, random));
          if (!stillHere || disposed) {
            return { dropped: true };
          }
          continue;
        }
        if (classified.kind !== 'network' && classified.kind !== 'server') {
          unresolved = null; // a definitive answer: the key is spent
        }
        return { problem: classified };
      }
    }
  }

  function applyAccepted(accepted: GenerationAccepted, extras: AcceptedExtras): JobEntry | null {
    const result = mergeAccepted(jobs, accepted, { desiredRevision: revision, now: now() }, extras);
    jobs = pruneJobs(result.jobs, selectedJobId);
    lastSubmittedRevision = Math.max(lastSubmittedRevision, accepted.clientRevision);
    return result.entry;
  }

  function handleAccepted(accepted: GenerationAccepted, prompt: string, prepared: PreparedInput, current: Pipeline): void {
    applyAccepted(accepted, {
      prompt,
      inputPreviewUrl: prepared.inputPreviewUrl ?? null,
      forceListed: accepted.intent === 'final',
    });
    if (problem && ['network', 'rate_limited', 'session', 'unknown', 'unauthorized'].includes(problem.kind)) {
      problem = null;
    }
    if (accepted.intent === 'final' && autoPause !== null) {
      autoPause = null; // an explicit, successful manual run resumes a paused Realtime session
    }
    conflictRetried = false;
    if (current.cancelOnAccept) {
      cancelWanted.add(accepted.id);
      void cancelJob(accepted.id);
    }
    void fetchSnapshot(accepted.id); // close the race between the 202 and the first event
    publish();
    ensurePolling();
  }

  function handleSubmitProblem(prob: ApiProblem, intent: GenerationIntent | null, rev: number): void {
    switch (prob.kind) {
      case 'rate_limited': {
        throttleUntil = now() + prob.retryAfterMs;
        problem = { kind: 'rate_limited', retryAt: throttleUntil };
        if (intent !== null) {
          queued = mergeIntent(queued, intent); // coalesce; resubmits the latest input after the wait
        }
        startThrottleTimer();
        break;
      }
      case 'insufficient_credits':
        problem = { kind: 'credits' };
        if (auto) {
          autoPause = 'credits';
        }
        ports.onCreditsProblem?.();
        break;
      case 'stale_revision':
      case 'not_found':
        if (intent === null || (prob.kind === 'stale_revision' && rev !== revision)) {
          break; // an older revision lost to a newer one: not an error
        }
        void renewSession(intent);
        break;
      case 'idempotency_conflict':
        if (!conflictRetried && intent !== null) {
          conflictRetried = true;
          queued = mergeIntent(queued, intent);
        } else {
          problem = { kind: 'unknown', message: 'idempotency_conflict' };
        }
        break;
      case 'invalid':
        problem = { kind: 'rejected', code: prob.code, message: prob.message, fieldErrors: prob.fieldErrors };
        break;
      case 'unauthorized':
        problem = { kind: 'unauthorized' };
        break;
      case 'network':
      case 'server':
        problem = { kind: 'network' };
        break;
      default:
        problem = { kind: 'unknown', message: prob.kind === 'unknown' ? prob.message : prob.kind };
    }
  }

  async function renewSession(intent: GenerationIntent): Promise<void> {
    if (renewedAtRevision === revision) {
      problem = { kind: 'session' };
      publish();
      return;
    }
    try {
      const session = await ports.api.createStudioSession();
      if (disposed) {
        return;
      }
      sessionId = session.id;
      revision = Math.max(revision, session.latestRevision) + 1;
      lastSubmittedRevision = session.latestRevision;
      lastAttemptedRevision = session.latestRevision;
      renewedAtRevision = revision;
      unresolved = null;
      ports.onSessionRenewed?.(session);
      queued = mergeIntent(queued, intent);
    } catch {
      if (!disposed) {
        problem = { kind: 'session' };
      }
    }
    publish();
    drain();
  }

  function startThrottleTimer(): void {
    if (throttleTimer !== null) {
      clearTimeout(throttleTimer);
    }
    const wait = Math.max(0, (throttleUntil ?? now()) - now());
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      throttleUntil = null;
      if (problem?.kind === 'rate_limited') {
        problem = null;
      }
      publish();
      drain();
    }, wait);
  }

  /** Replays a POST whose outcome is unknown (lost response) so an accepted job is not orphaned. */
  async function recoverUnresolved(): Promise<void> {
    const pending = unresolved;
    if (!pending || pipeline || disposed) {
      return;
    }
    try {
      const accepted = await ports.api.createGeneration(pending.body, pending.key);
      if (disposed) {
        return;
      }
      if (unresolved === pending) {
        unresolved = null;
      }
      applyAccepted(accepted, {
        prompt: pending.body.prompt,
        inputPreviewUrl: pending.prepared.inputPreviewUrl ?? null,
        forceListed: accepted.intent === 'final',
      });
      if (problem?.kind === 'network') {
        problem = null;
      }
      void fetchSnapshot(accepted.id);
      publish();
    } catch (error) {
      if (disposed) {
        return;
      }
      const classified = ports.classifyError(error);
      if (classified.kind !== 'network' && classified.kind !== 'server') {
        unresolved = null;
      }
    }
  }

  // ------------------------------------------------------------------ snapshots, hints and polling

  function applySnapshot(snapshot: GenerationSnapshot, extras: AcceptedExtras = {}): boolean {
    const result = mergeSnapshot(jobs, snapshot, { desiredRevision: revision, now: now() }, extras);
    if (!result.accepted) {
      return false;
    }
    jobs = pruneJobs(result.jobs, selectedJobId);
    ports.storeSnapshot(snapshot);
    if (result.newlyListed) {
      selectedJobId = null; // follow the newest output again
    }
    const entry = result.entry;
    if (result.becameTerminal && entry) {
      ports.onTerminal?.(snapshot);
      if (entry.status === 'FAILED' && entry.error && auto) {
        if (entry.error.code === 'PROVIDER_AUTH') {
          autoPause = 'provider_auth';
        } else if (entry.error.code === 'PROVIDER_QUOTA_EXHAUSTED') {
          autoPause = 'provider_quota';
        }
      }
    }
    publish();
    if (result.becameTerminal) {
      drain();
    }
    ensurePolling();
    return true;
  }

  function fetchSnapshot(jobId: string, extras: AcceptedExtras = {}): Promise<void> {
    const running = fetches.get(jobId);
    if (running) {
      running.again = true;
      return running.promise;
    }
    const record = { again: false, promise: Promise.resolve() };
    record.promise = (async () => {
      do {
        record.again = false;
        try {
          const snapshot = await ports.api.getGeneration(jobId);
          if (disposed) {
            return;
          }
          applySnapshot(snapshot, extras);
        } catch (error) {
          if (disposed) {
            return;
          }
          // A failed read is a connection matter, never a job failure: polling/reconcile will retry.
          ports.classifyError(error);
        }
      } while (record.again && !disposed);
    })().finally(() => {
      fetches.delete(jobId);
    });
    fetches.set(jobId, record);
    return record.promise;
  }

  function handleHint(event: GenerationUpdatedEvent): void {
    if (disposed) {
      return;
    }
    const decision = classifyHint(jobs, event, sessionId);
    if (decision === 'ignore') {
      return;
    }
    if (jobs.some((job) => job.jobId === event.jobId)) {
      jobs = touchSignal(jobs, event.jobId, now());
    }
    if (decision === 'drop') {
      return;
    }
    void fetchSnapshot(event.jobId);
  }

  function ensurePolling(): void {
    if (disposed || pollTimer !== null || !visible || !online) {
      return;
    }
    if (!jobs.some(isNonterminal)) {
      pollAttempt = 0;
      return;
    }
    pollTimer = setTimeout(() => {
      void pollTick();
    }, pollDelayMs(pollAttempt, random));
  }

  function stopPolling(): void {
    if (pollTimer !== null) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    pollAttempt = 0;
  }

  async function pollTick(): Promise<void> {
    pollTimer = null;
    if (disposed || !visible || !online) {
      return;
    }
    const due = jobs.filter(
      (job) => isNonterminal(job) && (connection !== 'connected' || now() - job.lastSignalAt >= QUIET_SIGNAL_MS)
    );
    if (due.length === 0) {
      ensurePolling();
      return;
    }
    const before = new Map(due.map((job) => [job.jobId, job.stateVersion]));
    await Promise.all(due.map((job) => fetchSnapshot(job.jobId)));
    if (disposed) {
      return;
    }
    const advanced = due.some((job) => {
      const after = jobs.find((candidate) => candidate.jobId === job.jobId);
      return after !== undefined && after.stateVersion > (before.get(job.jobId) ?? 0);
    });
    pollAttempt = advanced ? 0 : pollAttempt + 1;
    ensurePolling();
  }

  let reconciling: Promise<void> | null = null;

  /** REST is the recovery path: re-read every nonterminal job, recover a lost POST, then schedule. */
  function reconcile(): Promise<void> {
    if (reconciling) {
      return reconciling;
    }
    reconciling = (async () => {
      try {
        if (disposed || !visible || !online) {
          return;
        }
        await Promise.all([
          ...jobs.filter(isNonterminal).map((job) => fetchSnapshot(job.jobId)),
          recoverUnresolved(),
        ]);
        if (disposed) {
          return;
        }
        for (const jobId of Array.from(cancelWanted)) {
          const entry = jobs.find((job) => job.jobId === jobId);
          if (entry && isNonterminal(entry)) {
            void cancelJob(jobId);
          } else {
            cancelWanted.delete(jobId);
          }
        }
        ensurePolling();
        drain();
      } finally {
        reconciling = null;
      }
    })();
    return reconciling;
  }

  // ------------------------------------------------------------------ cancel / retry / save

  async function cancelJob(jobId: string): Promise<void> {
    if (cancelling.has(jobId) || disposed) {
      return;
    }
    cancelling.add(jobId);
    try {
      const snapshot = await ports.api.cancelGeneration(jobId);
      if (disposed) {
        return;
      }
      cancelWanted.delete(jobId);
      applySnapshot(snapshot);
    } catch (error) {
      if (disposed) {
        return;
      }
      const classified = ports.classifyError(error);
      if (classified.kind === 'already_completed' || classified.kind === 'not_found') {
        cancelWanted.delete(jobId);
        await fetchSnapshot(jobId);
      }
      // Other failures keep the job in cancelWanted; reconcile retries when the connection returns.
    } finally {
      cancelling.delete(jobId);
    }
  }

  async function retryJob(jobId: string): Promise<void> {
    const entry = jobs.find((job) => job.jobId === jobId);
    if (!entry || isNonterminal(entry) || entry.status === 'COMPLETED' || retrying.has(jobId) || finalActive()) {
      return;
    }
    retrying.add(jobId);
    const key = newKey(); // a retry is a new intent
    problem = null;
    publish();
    try {
      for (let attempt = 0; ; attempt += 1) {
        try {
          const accepted = await ports.api.retryGeneration(jobId, key);
          if (disposed) {
            return;
          }
          applyAccepted(accepted, { prompt: entry.prompt, forceListed: true, retryOfJobId: jobId });
          autoPause = null;
          void fetchSnapshot(accepted.id);
          publish();
          ensurePolling();
          return;
        } catch (error) {
          if (disposed) {
            return;
          }
          const classified = ports.classifyError(error);
          if ((classified.kind === 'network' || classified.kind === 'server') && attempt < maxReplays) {
            const stillHere = await sleep(replayDelayMs(attempt, random));
            if (!stillHere || disposed) {
              return;
            }
            continue; // same key
          }
          handleSubmitProblem(classified, null, revision);
          publish();
          return;
        }
      }
    } finally {
      retrying.delete(jobId);
    }
  }

  async function saveJob(jobId: string): Promise<boolean> {
    if (disposed || saving?.status === 'saving') {
      return false;
    }
    saving = { jobId, status: 'saving' };
    publish();
    try {
      const response = await ports.api.saveGeneration(jobId);
      if (disposed) {
        return false;
      }
      applySnapshot(response.generation);
      saving = null;
      publish();
      return true;
    } catch {
      if (disposed) {
        return false;
      }
      saving = { jobId, status: 'error' };
      publish();
      return false;
    }
  }

  // ------------------------------------------------------------------ public controls

  function setAuto(on: boolean): void {
    if (disposed) {
      return;
    }
    if (on === auto && !(on && autoPause !== null)) {
      return;
    }
    auto = on;
    if (!on) {
      clearDebounce();
      gateWait = false;
      if (queued === 'preview') {
        queued = null;
      }
      if (pipeline && pipeline.intent === 'preview') {
        pipeline.cancelOnAccept = true; // a preview POST already on the wire is cancelled once accepted
        pipeline.controller.abort();
      }
      for (const job of jobs) {
        if (job.intent === 'preview' && isNonterminal(job)) {
          cancelWanted.add(job.jobId);
          void cancelJob(job.jobId); // never an explicit final
        }
      }
    } else {
      autoPause = null;
      if (problem?.kind === 'credits') {
        problem = null;
      }
      if (validateNow() === null && !hasCurrentJob() && autoEffective()) {
        armDebounce(); // at most one valid current snapshot
      }
    }
    publish();
  }

  function generate(): void {
    if (disposed) {
      return;
    }
    const issue = validateNow();
    if (issue) {
      problem = { kind: 'invalid', issue };
      publish();
      return;
    }
    if (finalActive()) {
      return;
    }
    clearDebounce();
    gateWait = false;
    if (queued === 'preview') {
      queued = null; // supersedes pending auto work
    }
    if (problem && problem.kind !== 'rate_limited') {
      problem = null;
    }
    submit('final');
  }

  function stop(): void {
    if (disposed) {
      return;
    }
    clearDebounce();
    gateWait = false;
    queued = null;
    if (pipeline) {
      pipeline.stopped = true;
      pipeline.cancelOnAccept = true;
      pipeline.controller.abort(); // aborts only local preparation; a POST on the wire finishes, then is cancelled
    }
    for (const job of jobs) {
      if (isNonterminal(job)) {
        cancelWanted.add(job.jobId);
        void cancelJob(job.jobId);
      }
    }
    if (throttleTimer !== null) {
      clearTimeout(throttleTimer);
      throttleTimer = null;
      throttleUntil = null;
      if (problem?.kind === 'rate_limited') {
        problem = null;
      }
    }
    publish();
  }

  function setVisible(next: boolean): void {
    if (disposed || next === visible) {
      return;
    }
    visible = next;
    if (!next) {
      clearDebounce(); // hidden tabs make no new automatic submissions; the draft stays
      stopPolling();
      publish();
      return;
    }
    publish();
    void reconcile();
  }

  function setOnline(next: boolean): void {
    if (disposed || next === online) {
      return;
    }
    online = next;
    if (!next) {
      clearDebounce();
      stopPolling();
      publish();
      return;
    }
    publish();
    void reconcile();
  }

  function setConnection(next: ConnectionState): void {
    if (disposed || next === connection) {
      return;
    }
    const previous = connection;
    connection = next;
    publish();
    if (next === 'connected' && previous !== 'connected') {
      void reconcile();
    } else if (next !== 'connected') {
      ensurePolling();
    }
  }

  function adoptJobs(adopted: readonly AdoptedJob[]): void {
    for (const item of adopted) {
      void fetchSnapshot(item.jobId, { prompt: item.prompt });
    }
  }

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    clearDebounce();
    stopPolling();
    if (throttleTimer !== null) {
      clearTimeout(throttleTimer);
      throttleTimer = null;
    }
    pipeline?.controller.abort();
    for (const wake of Array.from(sleepers)) {
      wake();
    }
    sleepers.clear();
    listeners.clear();
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    updateInput,
    compositionStart() {
      if (disposed) {
        return;
      }
      composing = true;
      publish();
    },
    compositionEnd(finalPrompt) {
      if (disposed) {
        return;
      }
      composing = false;
      const prompt = finalPrompt ?? heldPrompt;
      heldPrompt = null;
      if (prompt !== null && prompt !== undefined) {
        commit({ prompt });
      }
      releaseGate();
    },
    setDrawing(active) {
      if (disposed) {
        return;
      }
      drawing = active;
      if (!active) {
        releaseGate();
      }
      publish();
    },
    setAuto,
    generate,
    stop,
    retry(jobId) {
      void retryJob(jobId);
    },
    save: saveJob,
    select(jobId) {
      if (disposed) {
        return;
      }
      selectedJobId = jobId;
      publish();
    },
    refreshJob: (jobId) => fetchSnapshot(jobId),
    setVisible,
    setOnline,
    setConnection,
    handleHint,
    adoptJobs,
    dispose,
  };
}
