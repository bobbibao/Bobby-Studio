import { createHash } from 'crypto';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import * as sharp from 'sharp';
import { ApiRejectedError, ApiUnavailableError, InternalApi } from '../api/internal-api-client';
import { ClaimResponse, GenerationQueueMessageV1, WorkerEventAck, WorkerEventV1 } from '../contracts/generation.contracts';
import { createImageProvider } from '../providers/provider.registry';
import { startSimulatorProcess, SimulatorProcess } from '../providers/testing/simulator-process';
import { LocalAssetStorage } from '../storage/asset-storage';
import { GenerationProcessor, RetryLaterError } from './generation-processor';

jest.setTimeout(60_000);

const silent = { log: () => undefined, warn: () => undefined, error: () => undefined };

/** In-memory API implementing the claim/event protocol the worker depends on. */
class FakeApi implements InternalApi {
  claimResponse: ClaimResponse = { action: 'skip', reason: 'unknown_job' };
  events: WorkerEventV1[] = [];
  /** Per event type, the ack to answer with (default: applied). */
  acks: Partial<Record<WorkerEventV1['type'], WorkerEventAck>> = {};
  /** Fail the first N deliveries of any event with a transient error. */
  transientFailures = 0;
  claims = 0;

  async claim(): Promise<ClaimResponse> {
    this.claims += 1;
    return this.claimResponse;
  }

  async sendEvent(_jobId: string, event: WorkerEventV1): Promise<WorkerEventAck> {
    if (this.transientFailures > 0) {
      this.transientFailures -= 1;
      throw new ApiUnavailableError('simulated outage');
    }
    this.events.push(event);
    return this.acks[event.type] ?? { acknowledged: true, applied: true };
  }

  types = () => this.events.map((event) => event.type);
}

describe('GenerationProcessor against the real simulator', () => {
  let simulator: SimulatorProcess;
  let root: string;
  let storage: LocalAssetStorage;
  let api: FakeApi;

  const jobId = '4e0f6a1b-2c3d-4e5f-8a9b-0c1d2e3f4a5b';
  const message = (overrides: Partial<GenerationQueueMessageV1> = {}): GenerationQueueMessageV1 => ({
    schemaVersion: 1,
    jobId,
    requestId: '5f1a7b2c-3d4e-4f60-9b0c-1d2e3f4a5b6c',
    studioSessionId: '7a1f6f5e-3d6b-4f9e-9a3a-0d1b2c3d4e5f',
    clientRevision: 1,
    intent: 'final',
    modelId: 'simulated-openai-image',
    mode: 'text_to_image',
    prompt: 'A modern timber and glass home',
    size: { width: 1024, height: 1024 },
    quality: 'preview',
    inputAssetId: null,
    inputHash: 'h'.repeat(64),
    deadlineAt: new Date(Date.now() + 30_000).toISOString(),
    traceId: '8b3c9d4e-5f60-4b82-9d2e-3f4a5b6c7d8e',
    ...overrides,
  });
  const run = (overrides: Partial<Extract<ClaimResponse, { action: 'run' }>> = {}) => {
    api.claimResponse = {
      action: 'run',
      attemptId: 'ad5e1f60-7182-4da4-9f40-5b6c7d8e9fa0',
      runToken: 'run-token-0123456789abcdef',
      checkpoint: null,
      outcomeUnknown: false,
      input: null,
      deadlineAt: new Date(Date.now() + 30_000).toISOString(),
      ...overrides,
    };
  };
  const processor = (provider = createImageProvider({ id: 'openai', mode: 'simulated', baseUrl: simulator.baseUrl, apiKey: simulator.apiKey, model: 'simulated-openai-image' })) =>
    new GenerationProcessor({ api, provider, storage, logger: silent, sleep: async () => undefined, deliveryBackoffMs: [1, 1, 1] });

  beforeAll(async () => {
    simulator = await startSimulatorProcess();
    root = mkdtempSync(path.join(tmpdir(), 'bobby-worker-spec-'));
    storage = new LocalAssetStorage(root);
  });
  afterAll(async () => {
    await simulator.stop();
    rmSync(root, { recursive: true, force: true });
  });
  beforeEach(async () => {
    api = new FakeApi();
    await simulator.reset();
  });

  it('claims, calls the provider once, stores a decodable result and delivers started, checkpoint, completed in order', async () => {
    run();
    const outcome = await processor().process(message());
    expect(outcome).toEqual({ kind: 'completed' });
    expect(api.types()).toEqual(['started', 'checkpoint', 'completed']);
    expect(api.events.map((event) => event.sequence)).toEqual([1, 2, 3]);
    expect(new Set(api.events.map((event) => event.attemptId)).size).toBe(1);
    expect((await simulator.requests()).received).toBe(1);

    const completed = api.events[2] as WorkerEventV1<'completed'>;
    const [output] = completed.data.outputs;
    expect(output.storageKey).toBe(`generated/${jobId}/0.png`);
    const bytes = await storage.read(output.storageKey);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(output.sha256);
    const meta = await sharp(bytes).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 1024]);
    expect(completed.data.usage?.simulated).toBe(true);
  });

  it('passes the stored input image to the provider for image-based modes', async () => {
    const input = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#336699' } }).png().toBuffer();
    await storage.put('inputs/u/in.png', input, 'image/png');
    run({ input: { storageKey: 'inputs/u/in.png', mimeType: 'image/png', byteSize: input.length, sha256: createHash('sha256').update(input).digest('hex'), width: 64, height: 64 } });
    expect(await processor().process(message({ mode: 'image_to_image', inputAssetId: 'a' }))).toEqual({ kind: 'completed' });
    // An input image must reach the provider through the edits route, not text-to-image generations.
    const { byRoute } = await simulator.requests();
    expect(byRoute).toEqual({ 'openai.edits': 1 });
  });

  it('never calls the provider when the earlier attempt already stored a result', async () => {
    const outputs = [{ storageKey: `generated/${jobId}/0.png`, mimeType: 'image/png', byteSize: 10, sha256: 'a'.repeat(64), width: 1, height: 1 }];
    run({ checkpoint: { outputs } });
    expect(await processor().process(message())).toEqual({ kind: 'completed' });
    expect(api.types()).toEqual(['completed']);
    expect((await simulator.requests()).received).toBe(0);
  });

  it('recovers a result stored before a crash instead of repeating the paid call', async () => {
    run();
    await processor().process(message()); // produces and stores the file
    const storedBefore = (await simulator.requests()).received;

    api = new FakeApi();
    run({ outcomeUnknown: true });
    expect(await processor().process(message())).toEqual({ kind: 'completed' });
    expect(api.types()).toEqual(['completed']);
    expect((await simulator.requests()).received).toBe(storedBefore);
  });

  it('reports an unknown outcome instead of repeating inference when nothing can be recovered', async () => {
    run({ outcomeUnknown: true });
    const other = message({ jobId: '9d4e1f60-7182-4da4-9f40-5b6c7d8e9fa1' });
    expect(await processor().process(other)).toEqual({ kind: 'failed', code: 'PROVIDER_OUTCOME_UNKNOWN' });
    expect(api.events[0]).toMatchObject({ type: 'failed', data: { outcomeUnknown: true, retryable: false } });
    expect((await simulator.requests()).received).toBe(0);
  });

  it('does not start a paid call for a job that ended before it started, and stops when its attempt is superseded', async () => {
    run();
    api.acks.started = { acknowledged: true, applied: false, reason: 'terminal' };
    expect((await processor().process(message())).kind).toBe('skipped');
    expect((await simulator.requests()).received).toBe(0);

    api = new FakeApi();
    run();
    api.acks.started = { acknowledged: true, applied: false, reason: 'stale_attempt' };
    expect(await processor().process(message())).toEqual({ kind: 'stopped' });
    expect((await simulator.requests()).received).toBe(0);
  });

  it('retries a safe transient provider failure through the queue without declaring the job failed', async () => {
    run();
    await simulator.scenario('unavailable', { times: 1 });
    await expect(processor().process(message())).rejects.toBeInstanceOf(RetryLaterError);
    expect(api.events.at(-1)).toMatchObject({ type: 'failed', data: { errorCode: 'PROVIDER_UNAVAILABLE', retryable: true, outcomeUnknown: false } });
    expect((await simulator.requests()).received).toBe(1);
  });

  it('fails permanently without retry for authentication, quota and unusable output', async () => {
    for (const [scenario, code] of [['quota', 'PROVIDER_QUOTA_EXHAUSTED'], ['no_image', 'PROVIDER_NO_IMAGE'], ['malformed', 'PROVIDER_MALFORMED_OUTPUT']] as const) {
      api = new FakeApi();
      run();
      await simulator.reset();
      await simulator.scenario(scenario, { times: 1 });
      expect(await processor().process(message())).toEqual({ kind: 'failed', code });
      expect(api.events.at(-1)).toMatchObject({ type: 'failed', data: { errorCode: code, retryable: false } });
      expect((await simulator.requests()).received).toBe(1);
    }
  });

  it('treats a connection that dies after the request was sent as an unknown paid outcome', async () => {
    run();
    await simulator.scenario('reset', { times: 1 });
    expect(await processor().process(message())).toEqual({ kind: 'failed', code: 'PROVIDER_OUTCOME_UNKNOWN' });
    expect(api.events.at(-1)).toMatchObject({ type: 'failed', data: { outcomeUnknown: true } });
  });

  it('retries delivery of the same envelope through API outages without repeating inference', async () => {
    run();
    api.transientFailures = 3;
    expect(await processor().process(message())).toEqual({ kind: 'completed' });
    expect((await simulator.requests()).received).toBe(1);
    expect(api.types()).toEqual(['started', 'checkpoint', 'completed']);
  });

  it('surfaces a long API outage to the queue so the job is retried and recovered from storage', async () => {
    run();
    api.transientFailures = 1000;
    await expect(processor().process(message())).rejects.toBeInstanceOf(ApiUnavailableError);
    expect((await simulator.requests()).received).toBe(0);
  });

  it('does not retry when the API rejects the worker credential', async () => {
    const rejecting: InternalApi = {
      claim: async () => {
        throw new ApiRejectedError(401, 'rejected');
      },
      sendEvent: async () => {
        throw new ApiRejectedError(401, 'rejected');
      },
    };
    const p = new GenerationProcessor({ api: rejecting, provider: createImageProvider({ id: 'openai', mode: 'simulated', baseUrl: simulator.baseUrl, apiKey: simulator.apiKey, model: 'simulated-openai-image' }), storage, logger: silent });
    await expect(p.process(message())).rejects.toBeInstanceOf(ApiRejectedError);
  });

  it('defers while the session is busy and refuses unknown queue message versions before any call', async () => {
    api.claimResponse = { action: 'defer', retryAfterMs: 1500 };
    await expect(processor().process(message())).rejects.toMatchObject({ delayMs: 1500 });
    await expect(processor().process({ ...message(), schemaVersion: 2 })).rejects.toThrow(/Unsupported/);
    expect(api.claims).toBe(1);
  });
});
