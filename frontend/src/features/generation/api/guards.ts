import { JOB_STATUSES, type GenerationUpdatedEvent } from '../contracts';

/** Socket payloads cross a trust boundary: validate the minimum before treating one as a hint. */
export function isGenerationUpdatedEvent(value: unknown): value is GenerationUpdatedEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const jobId: unknown = Reflect.get(value, 'jobId');
  const stateVersion: unknown = Reflect.get(value, 'stateVersion');
  const status: unknown = Reflect.get(value, 'status');
  const schemaVersion: unknown = Reflect.get(value, 'schemaVersion');
  return (
    schemaVersion === 1 &&
    typeof jobId === 'string' &&
    typeof stateVersion === 'number' &&
    Number.isFinite(stateVersion) &&
    typeof status === 'string' &&
    JOB_STATUSES.some((known) => known === status)
  );
}
