import { createHash, randomUUID } from 'crypto';
import * as sharp from 'sharp';
import { ApiRejectedError, InternalApi } from '../api/internal-api-client';
import {
  AssetDescriptor,
  ClaimResponse,
  GenerationErrorCode,
  GenerationQueueMessageV1,
  WorkerEventDataByType,
  WorkerEventType,
  WorkerEventV1,
} from '../contracts/generation.contracts';
import { parseQueueMessage } from '../contracts/queue-message';
import { ImageGenerationOutput, ImageProvider, ProviderError } from '../providers/provider.port';
import { AssetStorage } from '../storage/asset-storage';

export type ProcessOutcome =
  | { kind: 'completed' }
  | { kind: 'skipped'; reason: string }
  | { kind: 'failed'; code: GenerationErrorCode }
  /** The attempt was superseded (or the job ended) while we were working; nothing more to do. */
  | { kind: 'stopped' };

/** Ask BullMQ to run this job again later. The API already recorded why (a safe retryable failure or a defer). */
export class RetryLaterError extends Error {
  constructor(public readonly delayMs: number, reason: string) {
    super(reason);
    this.name = 'RetryLaterError';
  }
}

export interface ProcessorLogger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface ProcessorDeps {
  api: InternalApi;
  provider: ImageProvider;
  storage: AssetStorage;
  logger: ProcessorLogger;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** Delays between delivery retries of one event. Total waiting is bounded; the API ack is mandatory. */
  deliveryBackoffMs?: readonly number[];
}

const EXTENSION: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const DEFAULT_BACKOFF = [250, 1000, 3000, 8000] as const;
const DEFAULT_RETRY_DELAY_MS = 2000;

/**
 * Executes one generation job end to end:
 *   claim -> (reuse stored result | recover stored file | call provider once) -> store -> checkpoint -> completed.
 *
 * Invariants:
 *  - The provider is called at most once per attempt and never for a job that already has a stored result
 *    or an unknown paid outcome; the adapter never retries (BullMQ + this policy are the single retry owner).
 *  - Storage and callback delivery are retried without repeating inference (outputs are stored under
 *    deterministic keys, so a crash after the provider answered can still be recovered).
 *  - Every event carries the attempt id, run token and a monotonic sequence; a stale ack stops the work.
 */
export class GenerationProcessor {
  constructor(private readonly deps: ProcessorDeps) {}

  async process(raw: unknown): Promise<ProcessOutcome> {
    const message = parseQueueMessage(raw);
    const claim = await this.deps.api.claim(message.jobId);
    if (claim.action === 'skip') {
      this.deps.logger.log(`job=${message.jobId} skipped (${claim.reason})`);
      return { kind: 'skipped', reason: claim.reason };
    }
    if (claim.action === 'defer') throw new RetryLaterError(claim.retryAfterMs, 'session busy');
    return new Attempt(this.deps, message, claim).run();
  }
}

class Attempt {
  private sequence = 0;
  private readonly startedAt: number;

  constructor(
    private readonly deps: ProcessorDeps,
    private readonly message: GenerationQueueMessageV1,
    private readonly claim: Extract<ClaimResponse, { action: 'run' }>,
  ) {
    this.startedAt = (deps.now ?? Date.now)();
  }

  async run(): Promise<ProcessOutcome> {
    let outputs: AssetDescriptor[] | null = this.claim.checkpoint?.outputs ?? null;
    let providerRequestId = this.claim.checkpoint?.providerRequestId;
    let usage: ImageGenerationOutput['usage'];

    if (!outputs && this.claim.outcomeUnknown) {
      // An earlier attempt reached the provider. Never repeat the paid call: only recover a stored file.
      outputs = await this.recoverStoredOutput();
      if (!outputs) {
        await this.send('failed', { errorCode: 'PROVIDER_OUTCOME_UNKNOWN', message: 'The earlier attempt did not report a result.', retryable: false, outcomeUnknown: true });
        return { kind: 'failed', code: 'PROVIDER_OUTCOME_UNKNOWN' };
      }
    }

    if (!outputs) {
      const input = await this.loadInput();
      if (input === 'unavailable') {
        await this.send('failed', { errorCode: 'STORAGE_UNAVAILABLE', message: 'The input image could not be read.', retryable: true, outcomeUnknown: false });
        throw new RetryLaterError(DEFAULT_RETRY_DELAY_MS, 'input unavailable');
      }
      const started = await this.send('started', {});
      if (started.reason === 'stale_attempt') return { kind: 'stopped' };
      if (started.reason === 'terminal') return { kind: 'skipped', reason: 'cancelled before provider call' };

      let generated: ImageGenerationOutput;
      try {
        generated = await this.callProvider(input);
      } catch (error) {
        return this.handleProviderError(error);
      }
      providerRequestId = generated.providerRequestId;
      usage = generated.usage;
      outputs = await this.storeOutputs(generated);
      if (!outputs) {
        // The paid result exists only in memory and cannot be stored: from the application's view it is lost.
        await this.send('failed', { errorCode: 'STORAGE_UNAVAILABLE', message: 'The result could not be stored.', retryable: false, outcomeUnknown: true });
        return { kind: 'failed', code: 'STORAGE_UNAVAILABLE' };
      }
      const checkpoint = await this.send('checkpoint', { outputs, providerRequestId });
      if (checkpoint.reason === 'stale_attempt') return { kind: 'stopped' };
    }

    const done = await this.send('completed', { outputs, providerRequestId, usage, durationMs: (this.deps.now ?? Date.now)() - this.startedAt });
    if (done.reason === 'stale_attempt') return { kind: 'stopped' };
    this.deps.logger.log(`job=${this.message.jobId} completed (applied=${done.applied}, trace=${this.message.traceId})`);
    return { kind: 'completed' };
  }

  private async loadInput(): Promise<{ bytes: Uint8Array; mimeType: string } | 'unavailable' | undefined> {
    if (!this.claim.input) return undefined;
    try {
      const bytes = await this.deps.storage.read(this.claim.input.storageKey);
      if (createHash('sha256').update(bytes).digest('hex') !== this.claim.input.sha256) return 'unavailable';
      return { bytes, mimeType: this.claim.input.mimeType };
    } catch {
      return 'unavailable';
    }
  }

  private async callProvider(input: { bytes: Uint8Array; mimeType: string } | undefined): Promise<ImageGenerationOutput> {
    const controller = new AbortController();
    const remaining = Date.parse(this.claim.deadlineAt) - (this.deps.now ?? Date.now)();
    const timer = setTimeout(() => controller.abort(), Math.max(0, remaining));
    try {
      return await this.deps.provider.generate(
        {
          modelId: this.message.modelId,
          mode: this.message.mode,
          prompt: this.message.prompt,
          inputImage: input ? { bytes: input.bytes, mimeType: input.mimeType } : undefined,
          width: this.message.size.width,
          height: this.message.size.height,
          quality: this.message.quality,
        },
        { signal: controller.signal, correlationId: this.message.traceId, deadlineAt: this.claim.deadlineAt },
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private async handleProviderError(error: unknown): Promise<ProcessOutcome> {
    const now = (this.deps.now ?? Date.now)();
    const providerError = error instanceof ProviderError ? error : null;
    const code = providerError?.code ?? 'INTERNAL';
    const outcomeUnknown = providerError ? providerError.outcomeUnknown || code === 'PROVIDER_OUTCOME_UNKNOWN' : true;
    this.deps.logger.warn(`job=${this.message.jobId} provider failure code=${code} unknown=${outcomeUnknown} status=${providerError?.httpStatus ?? '-'} trace=${this.message.traceId}`);

    const retryable = !outcomeUnknown && (code === 'PROVIDER_UNAVAILABLE' || code === 'PROVIDER_RATE_LIMITED');
    const delayMs = Math.max(providerError?.retryAfterMs ?? 0, DEFAULT_RETRY_DELAY_MS);
    if (retryable && now + delayMs < Date.parse(this.claim.deadlineAt)) {
      await this.send('failed', { errorCode: code as GenerationErrorCode, message: 'Temporary provider failure; retrying.', retryable: true, outcomeUnknown: false });
      throw new RetryLaterError(delayMs, `retry after ${code}`);
    }

    const mapped: GenerationErrorCode = outcomeUnknown
      ? 'PROVIDER_OUTCOME_UNKNOWN'
      : code === 'CANCELLED'
        ? 'DEADLINE_EXCEEDED'
        : (code as GenerationErrorCode);
    await this.send('failed', { errorCode: mapped, message: 'The image service could not complete the request.', retryable: false, outcomeUnknown });
    return { kind: 'failed', code: mapped };
  }

  private async storeOutputs(generated: ImageGenerationOutput): Promise<AssetDescriptor[] | null> {
    const descriptors: AssetDescriptor[] = [];
    for (const [index, image] of generated.images.entries()) {
      const extension = EXTENSION[image.mimeType];
      if (!extension) return null;
      const bytes = Buffer.from(image.bytes);
      const storageKey = `generated/${this.message.jobId}/${index}.${extension}`;
      let stored = false;
      for (let attempt = 0; attempt < 4 && !stored; attempt += 1) {
        try {
          await this.deps.storage.put(storageKey, bytes, image.mimeType);
          stored = true;
        } catch {
          await (this.deps.sleep ?? sleep)(200 * 2 ** attempt);
        }
      }
      if (!stored) return null;
      descriptors.push({
        storageKey,
        mimeType: image.mimeType,
        byteSize: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        width: image.width ?? 0,
        height: image.height ?? 0,
      });
    }
    return descriptors.length > 0 ? descriptors : null;
  }

  /** Deterministic keys let a crash between "provider answered" and "checkpoint delivered" be recovered. */
  private async recoverStoredOutput(): Promise<AssetDescriptor[] | null> {
    for (const [mimeType, extension] of Object.entries(EXTENSION)) {
      const storageKey = `generated/${this.message.jobId}/0.${extension}`;
      try {
        if (!(await this.deps.storage.exists(storageKey))) continue;
        const bytes = await this.deps.storage.read(storageKey);
        const meta = await sharp(bytes, { limitInputPixels: 64_000_000 }).metadata();
        if (!meta.width || !meta.height) continue;
        return [{ storageKey, mimeType, byteSize: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), width: meta.width, height: meta.height }];
      } catch {
        continue;
      }
    }
    return null;
  }

  /** Delivers one event, retrying the SAME envelope (same id and sequence) until the API acknowledges it. */
  private async send<T extends WorkerEventType>(type: T, data: WorkerEventDataByType[T]) {
    const envelope = {
      schemaVersion: 1,
      eventId: randomUUID(),
      jobId: this.message.jobId,
      attemptId: this.claim.attemptId,
      runToken: this.claim.runToken,
      sequence: ++this.sequence,
      type,
      occurredAt: new Date().toISOString(),
      data,
    } as WorkerEventV1;
    const delays = this.deps.deliveryBackoffMs ?? DEFAULT_BACKOFF;
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.deps.api.sendEvent(this.message.jobId, envelope);
      } catch (error) {
        if (error instanceof ApiRejectedError || attempt >= delays.length) throw error;
        await (this.deps.sleep ?? sleep)(delays[attempt]);
      }
    }
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
