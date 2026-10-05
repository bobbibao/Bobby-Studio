import { vi, type Mock } from 'vitest';
import type {
  CatalogModel,
  CreateGenerationRequest,
  GenerationAccepted,
  GenerationSnapshot,
  GenerationUpdatedEvent,
} from '../contracts';
import { createHistory, commitStroke, toSnapshot } from '../canvas/strokes';
import { validateInput } from './input';
import { createRealtimeScheduler } from './scheduler';
import type { ApiProblem, RealtimeScheduler, SchedulerOptions, SchedulerPorts, StudioInput } from './types';

/** Test-only helpers: a controllable in-memory "server" behind the scheduler's ports. */

export class TestApiError extends Error {
  constructor(public readonly problem: ApiProblem) {
    super(problem.kind);
  }
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

export function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export const TEST_MODEL: CatalogModel = {
  id: 'model-1',
  displayName: 'Test model',
  provider: 'openai',
  isSimulated: true,
  capabilities: {
    modes: ['text_to_image', 'sketch_to_image', 'image_to_image'],
    sizes: [
      { width: 1024, height: 1024 },
      { width: 1536, height: 1024 },
    ],
    qualities: ['preview', 'standard'],
    negativePrompt: false,
    seed: false,
    cancellation: true,
    partialImages: false,
  },
  limits: { maxPromptChars: 4000, maxInputImageBytes: 10 * 1024 * 1024, inputMimeTypes: ['image/png', 'image/jpeg', 'image/webp'] },
  creditEstimate: { preview: 1, standard: 4 },
  entitled: true,
};

export function baseInput(overrides: Partial<StudioInput> = {}): StudioInput {
  return {
    prompt: 'a timber house',
    mode: 'prompt',
    modelId: TEST_MODEL.id,
    size: { width: 1024, height: 1024 },
    quality: 'preview',
    sketch: toSnapshot(createHistory()),
    reference: null,
    ...overrides,
  };
}

export function sketchWithInk(): StudioInput['sketch'] {
  return toSnapshot(commitStroke(createHistory(), { tool: 'brush', size: 8, points: [0.1, 0.1, 0.5, 0.5] }));
}

export function makeSnapshot(overrides: Partial<GenerationSnapshot> & { id: string }): GenerationSnapshot {
  return {
    requestId: 'request-1',
    studioSessionId: 'session-1',
    clientRevision: 1,
    intent: 'preview',
    modelId: TEST_MODEL.id,
    mode: 'text_to_image',
    size: { width: 1024, height: 1024 },
    quality: 'preview',
    status: 'PENDING',
    stage: null,
    stateVersion: 1,
    isSimulated: true,
    creditCost: 1,
    cancellationRequested: false,
    error: null,
    result: null,
    retryOfJobId: null,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    completedAt: null,
    expiresAt: null,
    ...overrides,
  };
}

export function completedSnapshot(id: string, overrides: Partial<GenerationSnapshot> = {}): GenerationSnapshot {
  return makeSnapshot({
    id,
    status: 'COMPLETED',
    stage: null,
    stateVersion: 5,
    completedAt: '2026-10-05T00:00:05.000Z',
    result: {
      assets: [
        {
          assetId: `asset-${id}`,
          mimeType: 'image/png',
          width: 1024,
          height: 1024,
          byteSize: 1000,
          url: `https://assets.test/${id}.png`,
          thumbnailUrl: null,
          saved: false,
        },
      ],
    },
    ...overrides,
  });
}

export function hintFor(snapshot: GenerationSnapshot): GenerationUpdatedEvent {
  return {
    schemaVersion: 1,
    jobId: snapshot.id,
    studioSessionId: snapshot.studioSessionId,
    clientRevision: snapshot.clientRevision,
    stateVersion: snapshot.stateVersion,
    status: snapshot.status,
    stage: snapshot.stage,
    error: snapshot.error,
    assetIds: snapshot.result?.assets.map((asset) => asset.assetId) ?? [],
  };
}

/** A tiny in-memory server: create/get/cancel/retry/save over a map of snapshots. */
export class FakeServer {
  readonly jobs = new Map<string, GenerationSnapshot>();
  readonly created: Array<{ body: CreateGenerationRequest; key: string }> = [];
  private counter = 0;

  accept(body: CreateGenerationRequest, key: string): GenerationAccepted {
    this.created.push({ body, key });
    this.counter += 1;
    const id = `job-${this.counter}`;
    const snapshot = makeSnapshot({
      id,
      studioSessionId: body.studioSessionId,
      clientRevision: body.clientRevision,
      intent: body.intent,
      modelId: body.modelId,
      mode: body.mode,
      size: body.size,
      quality: body.quality,
    });
    this.jobs.set(id, snapshot);
    return {
      id,
      requestId: snapshot.requestId,
      studioSessionId: body.studioSessionId,
      clientRevision: body.clientRevision,
      intent: body.intent,
      status: 'PENDING',
      stateVersion: 1,
      isSimulated: true,
      pollAfterMs: 2000,
    };
  }

  get(id: string): GenerationSnapshot {
    const job = this.jobs.get(id);
    if (!job) {
      throw new TestApiError({ kind: 'not_found' });
    }
    return job;
  }

  /** Moves a job forward and returns the new snapshot (the caller decides whether to emit a hint). */
  advance(id: string, patch: Partial<GenerationSnapshot>): GenerationSnapshot {
    const current = this.get(id);
    const next: GenerationSnapshot = { ...current, ...patch, stateVersion: patch.stateVersion ?? current.stateVersion + 1 };
    this.jobs.set(id, next);
    return next;
  }

  complete(id: string): GenerationSnapshot {
    const current = this.get(id);
    const done = completedSnapshot(id, {
      studioSessionId: current.studioSessionId,
      clientRevision: current.clientRevision,
      intent: current.intent,
      stateVersion: current.stateVersion + 1,
    });
    this.jobs.set(id, done);
    return done;
  }
}

function mockOf<F extends (...args: never[]) => unknown>(impl?: (...args: Parameters<F>) => ReturnType<F>): Mocked<F> {
  return impl ? vi.fn<Parameters<F>, ReturnType<F>>(impl) : vi.fn<Parameters<F>, ReturnType<F>>();
}

type Mocked<F extends (...args: never[]) => unknown> = Mock<Parameters<F>, ReturnType<F>>;

export interface Harness {
  scheduler: RealtimeScheduler;
  server: FakeServer;
  ports: SchedulerPorts;
  api: {
    createGeneration: Mocked<SchedulerPorts['api']['createGeneration']>;
    getGeneration: Mocked<SchedulerPorts['api']['getGeneration']>;
    cancelGeneration: Mocked<SchedulerPorts['api']['cancelGeneration']>;
    retryGeneration: Mocked<SchedulerPorts['api']['retryGeneration']>;
    saveGeneration: Mocked<SchedulerPorts['api']['saveGeneration']>;
    createStudioSession: Mocked<SchedulerPorts['api']['createStudioSession']>;
  };
  prepareSketch: Mocked<SchedulerPorts['prepareSketch']>;
  storeSnapshot: Mocked<SchedulerPorts['storeSnapshot']>;
  onTerminal: Mocked<NonNullable<SchedulerPorts['onTerminal']>>;
}

export function createHarness(overrides: Partial<SchedulerOptions> = {}, input: StudioInput = baseInput()): Harness {
  const server = new FakeServer();
  const api = {
    createGeneration: mockOf<SchedulerPorts['api']['createGeneration']>(async (body, key) => server.accept(body, key)),
    getGeneration: mockOf<SchedulerPorts['api']['getGeneration']>(async (id) => server.get(id)),
    cancelGeneration: mockOf<SchedulerPorts['api']['cancelGeneration']>(async (id) =>
      server.advance(id, { status: 'CANCELLED', cancellationRequested: true, error: { code: 'CANCELLED', message: 'Cancelled' } })
    ),
    retryGeneration: mockOf<SchedulerPorts['api']['retryGeneration']>(async (id, key) => {
      const previous = server.get(id);
      return server.accept(
        {
          studioSessionId: previous.studioSessionId ?? 'session-1',
          clientRevision: previous.clientRevision ?? 1,
          intent: previous.intent,
          modelId: previous.modelId,
          mode: previous.mode,
          prompt: 'retry',
          size: previous.size,
          quality: previous.quality,
        },
        key
      );
    }),
    saveGeneration: mockOf<SchedulerPorts['api']['saveGeneration']>(async (id) => {
      const current = server.get(id);
      const saved = server.advance(id, {
        result: current.result
          ? { assets: current.result.assets.map((asset) => ({ ...asset, saved: true })) }
          : null,
      });
      return { generation: saved, libraryItemId: 'library-1' };
    }),
    createStudioSession: mockOf<SchedulerPorts['api']['createStudioSession']>(async () => ({ id: 'session-2', latestRevision: 40 })),
  };
  const prepareSketch = mockOf<SchedulerPorts['prepareSketch']>(async () => ({ inputAssetId: 'asset-sketch', inputPreviewUrl: 'blob:sketch' }));
  const storeSnapshot = mockOf<SchedulerPorts['storeSnapshot']>();
  const onTerminal = mockOf<NonNullable<SchedulerPorts['onTerminal']>>();
  const ports: SchedulerPorts = {
    api,
    classifyError: (error) => (error instanceof TestApiError ? error.problem : { kind: 'unknown', status: null, message: String(error) }),
    validate: (value) => validateInput(value, TEST_MODEL),
    prepareSketch,
    storeSnapshot,
    onTerminal,
  };
  let keyCounter = 0;
  const scheduler = createRealtimeScheduler({
    sessionId: 'session-1',
    initialRevision: 0,
    initialInput: input,
    ports,
    random: () => 0,
    newIdempotencyKey: () => `key-${++keyCounter}`,
    ...overrides,
  });
  return { scheduler, server, ports, api, prepareSketch, storeSnapshot, onTerminal };
}
