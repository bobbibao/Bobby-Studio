import {
  TERMINAL_JOB_STATUSES,
  type GenerationAccepted,
  type GenerationSnapshot,
  type GenerationUpdatedEvent,
  type JobStatus,
} from '../contracts';
import type { JobEntry } from './types';

export const isTerminalStatus = (status: JobStatus): boolean => TERMINAL_JOB_STATUSES.includes(status);
export const isNonterminal = (entry: JobEntry): boolean => !isTerminalStatus(entry.status);

export interface JobContext {
  desiredRevision: number;
  now: number;
}

export interface MergeResult {
  jobs: JobEntry[];
  /** The incoming data was not older than what is held and was applied. */
  accepted: boolean;
  entry: JobEntry | null;
  becameTerminal: boolean;
  newlyListed: boolean;
}

const rejected = (jobs: JobEntry[]): MergeResult => ({
  jobs,
  accepted: false,
  entry: null,
  becameTerminal: false,
  newlyListed: false,
});

function nextOrder(jobs: readonly JobEntry[]): number {
  return jobs.reduce((max, job) => Math.max(max, job.order), 0) + 1;
}

function nextListedSeq(jobs: readonly JobEntry[]): number {
  return jobs.reduce((max, job) => Math.max(max, job.listedSeq), 0) + 1;
}

export interface AcceptedExtras {
  prompt?: string | null;
  inputPreviewUrl?: string | null;
  forceListed?: boolean;
  retryOfJobId?: string | null;
}

/** Records a 202 response. An event or snapshot that already arrived with a newer state wins. */
export function mergeAccepted(
  jobs: JobEntry[],
  accepted: GenerationAccepted,
  context: JobContext,
  extras: AcceptedExtras = {}
): MergeResult {
  const existing = jobs.find((job) => job.jobId === accepted.id);
  if (existing) {
    const merged: JobEntry = {
      ...existing,
      prompt: existing.prompt ?? extras.prompt ?? null,
      inputPreviewUrl: existing.inputPreviewUrl ?? extras.inputPreviewUrl ?? null,
      forceListed: existing.forceListed || Boolean(extras.forceListed),
      revision: existing.revision ?? accepted.clientRevision,
    };
    return { jobs: jobs.map((job) => (job.jobId === merged.jobId ? merged : job)), accepted: true, entry: merged, becameTerminal: false, newlyListed: false };
  }
  const entry: JobEntry = {
    jobId: accepted.id,
    revision: accepted.clientRevision,
    intent: accepted.intent,
    status: accepted.status,
    stage: null,
    stateVersion: accepted.stateVersion,
    cancellationRequested: false,
    error: null,
    isSimulated: accepted.isSimulated,
    hasResult: false,
    saved: false,
    listed: false,
    listEvaluated: false,
    listedSeq: 0,
    forceListed: Boolean(extras.forceListed),
    retryOfJobId: extras.retryOfJobId ?? null,
    prompt: extras.prompt ?? null,
    inputPreviewUrl: extras.inputPreviewUrl ?? null,
    order: nextOrder(jobs),
    lastSignalAt: context.now,
  };
  return { jobs: [...jobs, entry], accepted: true, entry, becameTerminal: isTerminalStatus(entry.status), newlyListed: false };
}

/**
 * Applies a GET snapshot. Older stateVersions are dropped; a terminal state never regresses.
 * Obsolete previews (a newer input exists when they first complete) are evaluated once and never listed.
 */
export function mergeSnapshot(
  jobs: JobEntry[],
  snapshot: GenerationSnapshot,
  context: JobContext,
  extras: AcceptedExtras = {}
): MergeResult {
  const existing = jobs.find((job) => job.jobId === snapshot.id);
  if (existing) {
    if (snapshot.stateVersion < existing.stateVersion) {
      return rejected(jobs);
    }
    if (isTerminalStatus(existing.status) && snapshot.status !== existing.status) {
      return rejected(jobs);
    }
  }
  const hasResult = Boolean(snapshot.result && snapshot.result.assets.length > 0);
  const saved = hasResult && snapshot.result !== null && snapshot.result.assets.every((asset) => asset.saved);
  const base: JobEntry =
    existing ?? {
      jobId: snapshot.id,
      revision: snapshot.clientRevision,
      intent: snapshot.intent,
      status: snapshot.status,
      stage: snapshot.stage,
      stateVersion: snapshot.stateVersion,
      cancellationRequested: false,
      error: null,
      isSimulated: snapshot.isSimulated,
      hasResult: false,
      saved: false,
      listed: false,
      listEvaluated: false,
      listedSeq: 0,
      forceListed: Boolean(extras.forceListed),
      retryOfJobId: snapshot.retryOfJobId,
      prompt: extras.prompt ?? null,
      inputPreviewUrl: extras.inputPreviewUrl ?? null,
      order: nextOrder(jobs),
      lastSignalAt: context.now,
    };
  let entry: JobEntry = {
    ...base,
    revision: snapshot.clientRevision ?? base.revision,
    status: snapshot.status,
    stage: snapshot.stage,
    stateVersion: snapshot.stateVersion,
    cancellationRequested: snapshot.cancellationRequested,
    error: snapshot.error,
    isSimulated: snapshot.isSimulated,
    hasResult,
    saved,
    retryOfJobId: snapshot.retryOfJobId ?? base.retryOfJobId,
    lastSignalAt: context.now,
  };
  let newlyListed = false;
  if (!entry.listEvaluated && snapshot.status === 'COMPLETED' && hasResult) {
    const current = entry.revision !== null && entry.revision === context.desiredRevision;
    const listed = entry.intent === 'final' || entry.forceListed || current;
    entry = { ...entry, listEvaluated: true, listed, listedSeq: listed ? nextListedSeq(jobs) : 0 };
    newlyListed = listed;
  }
  const becameTerminal = isTerminalStatus(entry.status) && !(existing && isTerminalStatus(existing.status));
  const next = existing ? jobs.map((job) => (job.jobId === entry.jobId ? entry : job)) : [...jobs, entry];
  return { jobs: next, accepted: true, entry, becameTerminal, newlyListed };
}

export type HintDecision = 'drop' | 'ignore' | 'fetch';

/**
 * A socket event is only a hint. Drop it unless it is newer than what we hold; for an unknown job,
 * react only to this studio session's jobs (an event can overtake the 202 response).
 */
export function classifyHint(jobs: readonly JobEntry[], event: GenerationUpdatedEvent, sessionId: string): HintDecision {
  const existing = jobs.find((job) => job.jobId === event.jobId);
  if (existing) {
    return event.stateVersion <= existing.stateVersion ? 'drop' : 'fetch';
  }
  return event.studioSessionId === sessionId ? 'fetch' : 'ignore';
}

export function touchSignal(jobs: JobEntry[], jobId: string, now: number): JobEntry[] {
  return jobs.map((job) => (job.jobId === jobId ? { ...job, lastSignalAt: now } : job));
}

export function patchEntry(jobs: JobEntry[], jobId: string, patch: Partial<JobEntry>): JobEntry[] {
  return jobs.map((job) => (job.jobId === jobId ? { ...job, ...patch } : job));
}

/** Upper bound on the session's job projection; the oldest finished entries are dropped first. */
export const MAX_TRACKED_JOBS = 80;

export function pruneJobs(jobs: JobEntry[], keepJobId: string | null, max: number = MAX_TRACKED_JOBS): JobEntry[] {
  if (jobs.length <= max) {
    return jobs;
  }
  const removable = jobs
    .filter((job) => isTerminalStatus(job.status) && job.jobId !== keepJobId)
    .sort((a, b) => a.order - b.order)
    .slice(0, jobs.length - max)
    .map((job) => job.jobId);
  const doomed = new Set(removable);
  return jobs.filter((job) => !doomed.has(job.jobId));
}
