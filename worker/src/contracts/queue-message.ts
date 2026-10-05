import { GENERATION_INTENTS, GENERATION_MODES, GENERATION_QUALITIES, GENERATION_SCHEMA_VERSION, GenerationQueueMessageV1 } from './generation.contracts';

export class UnsupportedQueueMessageError extends Error {
  constructor(reason: string) {
    super(`Unsupported generation queue message: ${reason}`);
    this.name = 'UnsupportedQueueMessageError';
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Validates a queue payload before any provider call. Unknown schema versions and malformed
 * messages fail here, so a newer API never causes a blind paid inference by an older worker.
 */
export function parseQueueMessage(payload: unknown): GenerationQueueMessageV1 {
  if (!isObject(payload)) throw new UnsupportedQueueMessageError('payload is not an object');
  if (payload.schemaVersion !== GENERATION_SCHEMA_VERSION) throw new UnsupportedQueueMessageError('unknown schemaVersion');
  const text = (key: string) => typeof payload[key] === 'string' && (payload[key] as string).length > 0;
  for (const key of ['jobId', 'requestId', 'modelId', 'prompt', 'inputHash', 'deadlineAt', 'traceId']) {
    if (!text(key)) throw new UnsupportedQueueMessageError(`${key} is missing`);
  }
  if (!GENERATION_INTENTS.includes(payload.intent as never)) throw new UnsupportedQueueMessageError('intent is invalid');
  if (!GENERATION_MODES.includes(payload.mode as never)) throw new UnsupportedQueueMessageError('mode is invalid');
  if (!GENERATION_QUALITIES.includes(payload.quality as never)) throw new UnsupportedQueueMessageError('quality is invalid');
  const size = payload.size;
  if (!isObject(size) || !Number.isInteger(size.width) || !Number.isInteger(size.height)) {
    throw new UnsupportedQueueMessageError('size is invalid');
  }
  if (Number.isNaN(Date.parse(payload.deadlineAt as string))) throw new UnsupportedQueueMessageError('deadlineAt is invalid');
  // Bytes and base64 never travel through the queue.
  if ('image' in payload || 'imageBase64' in payload) {
    throw new UnsupportedQueueMessageError('message carries image data');
  }
  return payload as unknown as GenerationQueueMessageV1;
}
