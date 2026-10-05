import { JobStatus, TERMINAL_JOB_STATUSES } from '../../application/generation/contracts/generation.contracts';

/**
 * Lifecycle (contracts section 5). Terminal states are absorbing: a duplicate event is a no-op and
 * a retry creates a new job. The database enforces the same rule with a trigger.
 */
const ALLOWED: Record<JobStatus, readonly JobStatus[]> = {
  PENDING: ['QUEUED', 'PROCESSING', 'FAILED', 'CANCELLED'],
  QUEUED: ['PROCESSING', 'FAILED', 'CANCELLED'],
  PROCESSING: ['PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export const isTerminal = (status: string): boolean => (TERMINAL_JOB_STATUSES as readonly string[]).includes(status);

export const canTransition = (from: JobStatus, to: JobStatus): boolean => from === to || ALLOWED[from].includes(to);

/** Statuses a job may be in while it can still be cancelled, completed or failed by the lifecycle. */
export const NON_TERMINAL_STATUSES: readonly JobStatus[] = ['PENDING', 'QUEUED', 'PROCESSING'];

/** Deadlines (contracts section 3): configurable defaults adjusted per model later. */
export const DEADLINE_MS = { preview: 30_000, final: 120_000 } as const;
/** Per-user minimum spacing between previews; overridable by configuration (tests set it to 0). */
export const minPreviewIntervalMs = (): number => Number(process.env.GENERATION_MIN_PREVIEW_INTERVAL_MS ?? 2_000);
export const MAX_ACTIVE_EXECUTIONS_PER_USER = 2;
export const PREVIEW_RETENTION_MS = 24 * 60 * 60 * 1000;
export const INPUT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
