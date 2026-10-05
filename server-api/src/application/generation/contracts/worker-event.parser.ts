import { BadRequestException } from '@nestjs/common';
import {
  AssetDescriptor,
  GENERATION_ERROR_CODES,
  GENERATION_SCHEMA_VERSION,
  JOB_STAGES,
  WORKER_EVENT_TYPES,
  WorkerEventType,
  WorkerEventV1,
} from './generation.contracts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;

const fail = (message: string): never => {
  throw new BadRequestException(message);
};
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function parseAsset(value: unknown, path: string): AssetDescriptor {
  if (!isObject(value)) return fail(`${path} must be an object`);
  const { storageKey, mimeType, byteSize, sha256, width, height } = value;
  if (typeof storageKey !== 'string' || !storageKey || storageKey.length > 512 || storageKey.includes('..') || storageKey.startsWith('/')) {
    fail(`${path}.storageKey is invalid`);
  }
  if (typeof mimeType !== 'string' || !/^image\/(png|jpeg|webp)$/.test(mimeType)) fail(`${path}.mimeType is invalid`);
  if (!Number.isInteger(byteSize) || (byteSize as number) <= 0 || (byteSize as number) > 64 * 1024 * 1024) fail(`${path}.byteSize is invalid`);
  if (typeof sha256 !== 'string' || !SHA256.test(sha256)) fail(`${path}.sha256 is invalid`);
  if (!Number.isInteger(width) || (width as number) <= 0) fail(`${path}.width is invalid`);
  if (!Number.isInteger(height) || (height as number) <= 0) fail(`${path}.height is invalid`);
  return value as unknown as AssetDescriptor;
}

function parseOutputs(value: unknown, path: string): AssetDescriptor[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) return fail(`${path} must hold 1 to 4 outputs`);
  return value.map((item, index) => parseAsset(item, `${path}[${index}]`));
}

/**
 * Validates a worker callback envelope before any effect. Unknown schema versions, unknown types and
 * malformed data are rejected with 400; the discriminated `data` is checked per event type.
 */
export function parseWorkerEvent(body: unknown): WorkerEventV1 {
  if (!isObject(body)) return fail('Event body must be an object');
  if (body.schemaVersion !== GENERATION_SCHEMA_VERSION) fail('Unsupported schemaVersion');
  for (const key of ['eventId', 'jobId', 'attemptId'] as const) {
    if (typeof body[key] !== 'string' || !UUID.test(body[key] as string)) fail(`${key} must be a UUID`);
  }
  if (typeof body.runToken !== 'string' || body.runToken.length < 16 || body.runToken.length > 256) fail('runToken is invalid');
  if (!Number.isInteger(body.sequence) || (body.sequence as number) < 0) fail('sequence must be a non-negative integer');
  if (!WORKER_EVENT_TYPES.includes(body.type as WorkerEventType)) fail('Unknown event type');
  if (typeof body.occurredAt !== 'string' || Number.isNaN(Date.parse(body.occurredAt))) fail('occurredAt must be an ISO timestamp');
  if (!isObject(body.data)) fail('data must be an object');

  const data = body.data as Record<string, unknown>;
  switch (body.type as WorkerEventType) {
    case 'started':
      break;
    case 'progress':
      if (!JOB_STAGES.includes(data.stage as never)) fail('data.stage is invalid');
      break;
    case 'checkpoint':
      parseOutputs(data.outputs, 'data.outputs');
      break;
    case 'completed':
      parseOutputs(data.outputs, 'data.outputs');
      if (!Number.isFinite(data.durationMs) || (data.durationMs as number) < 0) fail('data.durationMs is invalid');
      break;
    case 'failed':
      if (!GENERATION_ERROR_CODES.includes(data.errorCode as never)) fail('data.errorCode is invalid');
      if (typeof data.message !== 'string' || data.message.length > 500) fail('data.message is invalid');
      if (typeof data.retryable !== 'boolean' || typeof data.outcomeUnknown !== 'boolean') fail('data flags are invalid');
      break;
  }
  return body as unknown as WorkerEventV1;
}
