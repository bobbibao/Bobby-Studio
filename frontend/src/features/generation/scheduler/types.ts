import type {
  CreateGenerationRequest,
  GenerationAccepted,
  GenerationErrorCode,
  GenerationIntent,
  GenerationQuality,
  GenerationSize,
  GenerationSnapshot,
  GenerationUpdatedEvent,
  JobStage,
  JobStatus,
  SaveGenerationResponse,
  StudioSessionResponse,
} from '../contracts';
import type { SketchSnapshot } from '../canvas/types';

export type StudioMode = 'prompt' | 'sketch' | 'reference';

export interface ReferenceState {
  /** Identity of the picked file; an upload completion for another key is stale. */
  key: string;
  /** Null while uploading or after a failed upload. */
  assetId: string | null;
  /** Local object URL for compare views; never submitted. */
  previewUrl?: string | null;
}

/** The committed editor input. Replaced (never mutated) on every change. */
export interface StudioInput {
  prompt: string;
  mode: StudioMode;
  modelId: string | null;
  size: GenerationSize | null;
  quality: GenerationQuality;
  sketch: SketchSnapshot;
  reference: ReferenceState | null;
}

export type InputIssueCode =
  | 'prompt_empty'
  | 'prompt_too_long'
  | 'model_missing'
  | 'model_not_entitled'
  | 'size_unsupported'
  | 'quality_unsupported'
  | 'mode_unsupported'
  | 'reference_required'
  | 'reference_uploading'
  | 'reference_failed';

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';

export interface FieldError {
  field: string;
  message: string;
}

/** Transport-neutral classification of a failed API call. */
export type ApiProblem =
  | { kind: 'network' }
  | { kind: 'server'; status: number }
  | { kind: 'rate_limited'; retryAfterMs: number }
  | { kind: 'insufficient_credits' }
  | { kind: 'stale_revision' }
  | { kind: 'idempotency_conflict' }
  | { kind: 'invalid'; code: 'INVALID_INPUT' | 'UNSUPPORTED_CAPABILITY'; message: string; fieldErrors: FieldError[] }
  | { kind: 'not_found' }
  | { kind: 'already_completed' }
  | { kind: 'unauthorized' }
  | { kind: 'unknown'; status: number | null; message: string };

export type SubmitProblem =
  | { kind: 'invalid'; issue: InputIssueCode }
  | { kind: 'rejected'; code: 'INVALID_INPUT' | 'UNSUPPORTED_CAPABILITY'; message: string; fieldErrors: FieldError[] }
  | { kind: 'rate_limited'; retryAt: number }
  | { kind: 'credits' }
  | { kind: 'network' }
  | { kind: 'unauthorized' }
  | { kind: 'session' }
  | { kind: 'prepare' }
  | { kind: 'unknown'; message: string };

export type AutoPause = 'provider_auth' | 'provider_quota' | 'credits';

/**
 * The editor's identity-and-status projection of one job. The full snapshot payload (result assets, URLs,
 * timestamps) lives in the TanStack Query cache; this record only decides which job may be shown and when.
 */
export interface JobEntry {
  jobId: string;
  revision: number | null;
  intent: GenerationIntent;
  status: JobStatus;
  stage: JobStage | null;
  stateVersion: number;
  cancellationRequested: boolean;
  error: { code: GenerationErrorCode; message: string } | null;
  isSimulated: boolean;
  hasResult: boolean;
  saved: boolean;
  /** Evaluated once, when the job first completes: obsolete previews are never listed or shown. */
  listed: boolean;
  listEvaluated: boolean;
  listedSeq: number;
  forceListed: boolean;
  retryOfJobId: string | null;
  prompt: string | null;
  inputPreviewUrl: string | null;
  order: number;
  lastSignalAt: number;
}

export interface PreparedInput {
  inputAssetId?: string;
  /** Local preview of the submitted input for compare views. */
  inputPreviewUrl?: string | null;
}

export interface PrepareContext {
  revision: number;
  /** Aborted when the revision becomes stale, on Stop and on dispose. Aborting never cancels a server job. */
  signal: AbortSignal;
}

export interface SavingState {
  jobId: string;
  status: 'saving' | 'error';
}

export interface SchedulerState {
  sessionId: string;
  /** The desired revision: increments immediately on every committed input change. */
  revision: number;
  lastSubmittedRevision: number;
  auto: boolean;
  autoPause: AutoPause | null;
  visible: boolean;
  online: boolean;
  connection: ConnectionState;
  composing: boolean;
  drawing: boolean;
  /** A debounce timer is armed or a request is queued/coalesced behind another. */
  waiting: boolean;
  /** A prepare/POST pipeline is running. */
  submitting: boolean;
  /** At least one nonterminal job or a submission exists that Stop can act on. */
  stoppable: boolean;
  finalActive: boolean;
  throttleUntil: number | null;
  problem: SubmitProblem | null;
  inputIssue: InputIssueCode | null;
  jobs: readonly JobEntry[];
  selectedJobId: string | null;
  saving: SavingState | null;
}

export interface SchedulerApi {
  createGeneration(body: CreateGenerationRequest, idempotencyKey: string): Promise<GenerationAccepted>;
  getGeneration(jobId: string): Promise<GenerationSnapshot>;
  cancelGeneration(jobId: string): Promise<GenerationSnapshot>;
  retryGeneration(jobId: string, idempotencyKey: string): Promise<GenerationAccepted>;
  saveGeneration(jobId: string): Promise<SaveGenerationResponse>;
  createStudioSession(): Promise<StudioSessionResponse>;
}

export interface SchedulerPorts {
  api: SchedulerApi;
  /** Turns a thrown transport error into a classification; keeps the scheduler free of HTTP libraries. */
  classifyError(error: unknown): ApiProblem;
  /** Client-side validation of a committed input; null when it can be submitted. */
  validate(input: StudioInput): InputIssueCode | null;
  /** Export + upload of a sketch. Resolves `{}` when there is nothing to upload (blank canvas). */
  prepareSketch(sketch: SketchSnapshot, size: GenerationSize, context: PrepareContext): Promise<PreparedInput>;
  /** Mirrors accepted snapshots into the server-state cache. */
  storeSnapshot(snapshot: GenerationSnapshot): void;
  onTerminal?(snapshot: GenerationSnapshot): void;
  onCreditsProblem?(): void;
  onSessionRenewed?(session: StudioSessionResponse): void;
}

export interface SchedulerOptions {
  sessionId: string;
  initialRevision: number;
  initialInput: StudioInput;
  initialAuto?: boolean;
  initialVisible?: boolean;
  initialOnline?: boolean;
  initialConnection?: ConnectionState;
  debounceMs?: number;
  /** Replays of a lost/timed-out POST (always with the same idempotency key) before surfacing the failure. */
  maxReplays?: number;
  ports: SchedulerPorts;
  now?: () => number;
  random?: () => number;
  newIdempotencyKey?: () => string;
}

export interface AdoptedJob {
  jobId: string;
  prompt: string | null;
}

export interface RealtimeScheduler {
  getState(): SchedulerState;
  subscribe(listener: () => void): () => void;
  /** Commits an input change. Unchanged values are ignored; a real change bumps the revision first. */
  updateInput(patch: Partial<StudioInput>): void;
  compositionStart(): void;
  compositionEnd(finalPrompt?: string): void;
  setDrawing(active: boolean): void;
  setAuto(on: boolean): void;
  /** Manual Generate: flushes the current input as an explicit final. */
  generate(): void;
  /** Stop: logical cancellation through the cancel API; browser HTTP aborts are not cancellation. */
  stop(): void;
  retry(jobId: string): void;
  save(jobId: string): Promise<boolean>;
  select(jobId: string | null): void;
  /** Re-reads a job snapshot, for example to refresh an expired signed URL. */
  refreshJob(jobId: string): Promise<void>;
  setVisible(visible: boolean): void;
  setOnline(online: boolean): void;
  setConnection(connection: ConnectionState): void;
  handleHint(event: GenerationUpdatedEvent): void;
  adoptJobs(jobs: readonly AdoptedJob[]): void;
  dispose(): void;
}
