import { describe, expect, it } from 'vitest';
import snapshot from '../../../../contracts/v1/generation-snapshot.json';
import event from '../../../../contracts/v1/socket-event.generation-updated.json';
import { JOB_STATUSES, TERMINAL_JOB_STATUSES } from './contracts';

// The browser reads these shared fixtures exactly as the API and worker produce them.
describe('generation contract fixtures', () => {
  it('snapshot uses the shared status vocabulary and carries a versioned state', () => {
    expect(JOB_STATUSES).toContain(snapshot.status);
    expect(TERMINAL_JOB_STATUSES).toContain(snapshot.status);
    expect(Number.isInteger(snapshot.stateVersion)).toBe(true);
    expect(snapshot.result?.assets[0]).toMatchObject({ assetId: expect.any(String), saved: false });
  });

  it('socket event is a small versioned hint for the same job', () => {
    expect(event.schemaVersion).toBe(1);
    expect(event.jobId).toBe(snapshot.id);
    expect(event.stateVersion).toBe(snapshot.stateVersion);
  });
});
