/**
 * Generation contracts, version 1.
 *
 * Three separate boundaries, never one shared DTO:
 *  1. Browser -> API   (public HTTP + Socket.IO)
 *  2. API -> worker    (queue message + service-authenticated claim/event API)
 *  3. Worker -> provider (adapter port; lives in the worker)
 *
 * The same shapes are mirrored in worker/src/contracts and frontend/src/features/generation/contracts.
 * contracts/v1/*.json holds fixtures that every application validates in its own tests.
 */

export const GENERATION_SCHEMA_VERSION = 1;

export const GENERATION_MODES = ['text_to_image', 'sketch_to_image', 'image_to_image'] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

export const GENERATION_INTENTS = ['preview', 'final'] as const;
export type GenerationIntent = (typeof GENERATION_INTENTS)[number];

export const GENERATION_QUALITIES = ['preview', 'standard'] as const;
export type GenerationQuality = (typeof GENERATION_QUALITIES)[number];

export const JOB_STATUSES = ['PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

/** Execution stage inside PROCESSING; independent of the public status. */
export const JOB_STAGES = ['queued', 'provider', 'storing', 'finalizing'] as const;
export type JobStage = (typeof JOB_STAGES)[number];

/** Normalized error vocabulary shared by API, worker and browser (contracts section 7). */
export const GENERATION_ERROR_CODES = [
  'INVALID_INPUT',
  'UNSUPPORTED_CAPABILITY',
  'PROVIDER_AUTH',
  'PROVIDER_QUOTA_EXHAUSTED',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_OUTCOME_UNKNOWN',
  'PROVIDER_MALFORMED_OUTPUT',
  'PROVIDER_NO_IMAGE',
  'STORAGE_UNAVAILABLE',
  'DEADLINE_EXCEEDED',
  'CANCELLED',
  'SUPERSEDED',
  'INTERNAL',
] as const;
export type GenerationErrorCode = (typeof GENERATION_ERROR_CODES)[number];

/** Codes returned as HTTP error bodies by the public API (field `code`). */
export const API_ERROR_CODES = [
  'IDEMPOTENCY_CONFLICT',
  'STALE_REVISION',
  'INSUFFICIENT_CREDITS',
  'RATE_LIMITED',
  'UNSUPPORTED_CAPABILITY',
  'INVALID_INPUT',
  'NOT_FOUND',
  'ALREADY_COMPLETED',
  'UNAVAILABLE',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  code: ApiErrorCode;
  fieldErrors?: Array<{ field: string; message: string }>;
}

// ---------------------------------------------------------------- browser <-> API

export interface GenerationSize {
  width: number;
  height: number;
}

/** POST /api/generations (header Idempotency-Key: uuid). Identity, prices and endpoints are never accepted from the client. */
export interface CreateGenerationRequest {
  studioSessionId: string;
  clientRevision: number;
  intent: GenerationIntent;
  modelId: string;
  mode: GenerationMode;
  prompt: string;
  inputAssetId?: string;
  size: GenerationSize;
  quality: GenerationQuality;
}

/** 202 response of POST /api/generations and POST /api/generations/:id/retry. */
export interface GenerationAccepted {
  id: string;
  requestId: string;
  studioSessionId: string;
  clientRevision: number;
  intent: GenerationIntent;
  status: JobStatus;
  stateVersion: number;
  isSimulated: boolean;
  pollAfterMs: number;
}

export interface GenerationResultAsset {
  assetId: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  /** Short-lived signed URL; refresh by re-reading the snapshot. */
  url: string;
  thumbnailUrl: string | null;
  saved: boolean;
}

export interface GenerationSnapshot {
  id: string;
  requestId: string;
  studioSessionId: string | null;
  clientRevision: number | null;
  intent: GenerationIntent;
  modelId: string;
  mode: GenerationMode;
  size: GenerationSize;
  quality: GenerationQuality;
  status: JobStatus;
  stage: JobStage | null;
  stateVersion: number;
  isSimulated: boolean;
  creditCost: number;
  cancellationRequested: boolean;
  error: { code: GenerationErrorCode; message: string } | null;
  result: { assets: GenerationResultAsset[] } | null;
  retryOfJobId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface GenerationPage {
  items: GenerationSnapshot[];
  nextCursor: string | null;
}

/**
 * Socket.IO event `generation.updated`, emitted to the owner's room. It is a hint with a version:
 * clients drop events with a lower stateVersion and reconcile through GET /api/generations/:id.
 */
export interface GenerationUpdatedEvent {
  schemaVersion: 1;
  jobId: string;
  studioSessionId: string | null;
  clientRevision: number | null;
  stateVersion: number;
  status: JobStatus;
  stage: JobStage | null;
  error: { code: GenerationErrorCode; message: string } | null;
  assetIds: string[];
}

// ---------------------------------------------------------------- API <-> worker

/** BullMQ message. Never contains image bytes, base64, keys or signed URLs. */
export interface GenerationQueueMessageV1 {
  schemaVersion: 1;
  jobId: string;
  requestId: string;
  studioSessionId: string | null;
  clientRevision: number | null;
  intent: GenerationIntent;
  modelId: string;
  mode: GenerationMode;
  prompt: string;
  size: GenerationSize;
  quality: GenerationQuality;
  inputAssetId: string | null;
  inputHash: string;
  deadlineAt: string;
  traceId: string;
}

export interface AssetDescriptor {
  storageKey: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  width: number;
  height: number;
}

/** Response of POST /api/internal/generations/:id/claim (service credential required). */
export type ClaimResponse =
  | { action: 'skip'; reason: 'terminal' | 'cancelled' | 'superseded' | 'unknown_job' | 'delivery_only' | 'expired' }
  | {
      action: 'run';
      attemptId: string;
      runToken: string;
      /** Present when an earlier attempt already received a provider result; inference must not repeat. */
      checkpoint: { outputs: AssetDescriptor[]; providerRequestId?: string } | null;
      /** Present when an earlier attempt started inference and its outcome is unknown. */
      outcomeUnknown: boolean;
      input: AssetDescriptor | null;
      deadlineAt: string;
    };

export const WORKER_EVENT_TYPES = ['started', 'progress', 'checkpoint', 'completed', 'failed'] as const;
export type WorkerEventType = (typeof WORKER_EVENT_TYPES)[number];

export interface WorkerEventDataByType {
  started: Record<string, never>;
  progress: { stage: JobStage };
  checkpoint: { outputs: AssetDescriptor[]; providerRequestId?: string };
  completed: {
    outputs: AssetDescriptor[];
    providerRequestId?: string;
    usage?: { unit: string; quantity: number; simulated: boolean };
    durationMs: number;
  };
  failed: { errorCode: GenerationErrorCode; message: string; retryable: boolean; outcomeUnknown: boolean };
}

/** POST /api/internal/generations/:id/events. The same eventId is reused on delivery retries. */
export interface WorkerEventV1<T extends WorkerEventType = WorkerEventType> {
  schemaVersion: 1;
  eventId: string;
  jobId: string;
  attemptId: string;
  runToken: string;
  /** Monotonic per attempt; resets only when the API grants a new attempt. */
  sequence: number;
  type: T;
  occurredAt: string;
  data: WorkerEventDataByType[T];
}

/** The API answers 200 only after the effect is durably committed (or known to be a duplicate/stale no-op). */
export interface WorkerEventAck {
  acknowledged: true;
  applied: boolean;
}
