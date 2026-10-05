import { isNonterminal } from './jobs';
import type { JobEntry, SchedulerState } from './types';

/** Versions shown in the session strip: completed, listed jobs in creation order. */
export function selectVersions(state: SchedulerState): JobEntry[] {
  return state.jobs.filter((job) => job.listed && job.hasResult).sort((a, b) => a.order - b.order);
}

/**
 * The displayed version: the user's selection when it is still listed, otherwise the output that most
 * recently became displayable. Obsolete previews were never listed, so they can never appear here.
 */
export function selectDisplayed(state: SchedulerState): JobEntry | null {
  const versions = selectVersions(state);
  if (state.selectedJobId) {
    const selected = versions.find((job) => job.jobId === state.selectedJobId);
    if (selected) {
      return selected;
    }
  }
  return versions.reduce<JobEntry | null>((latest, job) => (latest === null || job.listedSeq > latest.listedSeq ? job : latest), null);
}

/** The newest job that is still running (the one the user is waiting for). */
export function selectActiveJob(state: SchedulerState): JobEntry | null {
  return state.jobs.filter(isNonterminal).reduce<JobEntry | null>((latest, job) => (latest === null || job.order > latest.order ? job : latest), null);
}

/**
 * The newest job that ended without a result and is relevant to the current input or was an explicit
 * final. Superseded previews are expected housekeeping, not an outcome to report.
 */
export function selectLatestFailure(state: SchedulerState): JobEntry | null {
  const newest = state.jobs.reduce<JobEntry | null>((latest, job) => (latest === null || job.order > latest.order ? job : latest), null);
  if (!newest || (newest.status !== 'FAILED' && newest.status !== 'CANCELLED')) {
    return null;
  }
  if (newest.error?.code === 'SUPERSEDED') {
    return null;
  }
  if (newest.intent === 'final' || newest.forceListed || newest.revision === state.revision) {
    return newest;
  }
  return null;
}

export type OutputFreshness = 'none' | 'current' | 'stale';

/** Whether the displayed output belongs to the current input revision. */
export function selectFreshness(state: SchedulerState, displayed: JobEntry | null): OutputFreshness {
  if (!displayed) {
    return 'none';
  }
  return displayed.revision === state.revision ? 'current' : 'stale';
}

/** True while an update for the current input is pending, preparing, submitted or running. */
export function selectIsUpdating(state: SchedulerState): boolean {
  return state.submitting || state.waiting || state.jobs.some(isNonterminal);
}
