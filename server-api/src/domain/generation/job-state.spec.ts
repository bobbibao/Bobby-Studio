import { JOB_STATUSES, JobStatus } from '../../application/generation/contracts/generation.contracts';
import { canTransition, isTerminal } from './job-state';

describe('job state machine', () => {
  it('never leaves a terminal state', () => {
    for (const from of JOB_STATUSES.filter(isTerminal)) {
      for (const to of JOB_STATUSES) {
        expect(canTransition(from as JobStatus, to)).toBe(to === from);
      }
    }
  });

  it('allows a worker to win the race against publisher bookkeeping', () => {
    expect(canTransition('PENDING', 'PROCESSING')).toBe(true);
    expect(canTransition('QUEUED', 'PENDING')).toBe(false);
  });

  it('allows cancel and failure from every non-terminal state', () => {
    for (const from of ['PENDING', 'QUEUED', 'PROCESSING'] as JobStatus[]) {
      expect(canTransition(from, 'CANCELLED')).toBe(true);
      expect(canTransition(from, 'FAILED')).toBe(true);
    }
  });

  it('only completes jobs that were claimed or are processing', () => {
    expect(canTransition('PROCESSING', 'COMPLETED')).toBe(true);
    expect(canTransition('QUEUED', 'COMPLETED')).toBe(false);
  });
});
