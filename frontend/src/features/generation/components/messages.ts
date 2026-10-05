import type { TFunction } from 'i18next';
import type { GenerationErrorCode } from '../contracts';
import type { AutoPause, InputIssueCode, JobEntry, SubmitProblem } from '../scheduler/types';

/** User-facing copy for job errors, keyed by the normalized code. The raw server message is never shown. */
export function errorCopy(t: TFunction, code: GenerationErrorCode | null): string {
  switch (code) {
    case 'PROVIDER_AUTH':
    case 'PROVIDER_QUOTA_EXHAUSTED':
      return t('errors.provider_unavailable_config');
    case 'PROVIDER_RATE_LIMITED':
      return t('errors.rate_limited_provider');
    case 'PROVIDER_UNAVAILABLE':
    case 'PROVIDER_OUTCOME_UNKNOWN':
      return t('errors.provider_unavailable');
    case 'PROVIDER_MALFORMED_OUTPUT':
    case 'PROVIDER_NO_IMAGE':
      return t('errors.no_image');
    case 'INVALID_INPUT':
    case 'UNSUPPORTED_CAPABILITY':
      return t('errors.invalid_input');
    case 'STORAGE_UNAVAILABLE':
      return t('errors.storage');
    case 'DEADLINE_EXCEEDED':
      return t('errors.deadline');
    default:
      return t('errors.generic');
  }
}

export function inputIssueCopy(t: TFunction, issue: InputIssueCode): string {
  return t(`issues.${issue}`);
}

export function autoPauseCopy(t: TFunction, pause: AutoPause): string {
  switch (pause) {
    case 'provider_auth':
    case 'provider_quota':
      return t('realtime.paused_provider');
    case 'credits':
      return t('realtime.paused_credits');
    default:
      return t('realtime.paused');
  }
}

export function stageCopy(t: TFunction, job: Pick<JobEntry, 'status' | 'stage' | 'cancellationRequested'>): string {
  if (job.cancellationRequested) {
    return t('status.cancelling');
  }
  if (job.status === 'PENDING') {
    return t('status.pending');
  }
  if (job.status === 'QUEUED') {
    return t('status.queued');
  }
  switch (job.stage) {
    case 'provider':
      return t('status.stage_provider');
    case 'storing':
      return t('status.stage_storing');
    case 'finalizing':
      return t('status.stage_finalizing');
    default:
      return t('status.processing');
  }
}

export interface ProblemCopy {
  text: string;
  /** Whether the message must be announced assertively. Throttling and connection issues stay polite. */
  urgent: boolean;
}

export function problemCopy(t: TFunction, problem: SubmitProblem, extras: { balance?: string; seconds?: number }): ProblemCopy {
  switch (problem.kind) {
    case 'invalid':
      return { text: inputIssueCopy(t, problem.issue), urgent: false };
    case 'rejected': {
      const detail = problem.fieldErrors.map((entry) => entry.message).join(' ');
      return { text: detail ? `${t('errors.invalid_input')} ${detail}` : t('errors.invalid_input'), urgent: false };
    }
    case 'rate_limited':
      return { text: t('errors.rate_limited', { count: extras.seconds ?? 1 }), urgent: false };
    case 'credits':
      return {
        text: extras.balance ? t('errors.credits_with_balance', { balance: extras.balance }) : t('errors.credits'),
        urgent: true,
      };
    case 'network':
      return { text: t('errors.network'), urgent: false };
    case 'unauthorized':
      return { text: t('errors.unauthorized'), urgent: true };
    case 'session':
      return { text: t('errors.session'), urgent: true };
    case 'prepare':
      return { text: t('errors.prepare'), urgent: true };
    default:
      return { text: t('errors.generic'), urgent: true };
  }
}
