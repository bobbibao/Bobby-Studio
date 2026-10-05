import * as sharp from 'sharp';
import type { WorkerRuntimeConfig } from '../config/worker-config';
import { createImageProvider } from './provider.registry';
import { ProviderError, type ImageGenerationInput, type ImageProvider, type ProviderContext, type ProviderErrorCode, type ProviderLogger } from './provider.port';
import { startSimulatorProcess, type SimulatorProcess } from './testing/simulator-process';

/**
 * Drives both production adapters against the real HTTP image simulator (V05/V06). The simulator
 * must be built first: `yarn --cwd image-simulator build`. The adapters send no Bobby control
 * headers, so scenarios are selected through the simulator's key-protected control endpoint.
 */
jest.setTimeout(60_000);

const silentLogger: ProviderLogger = { log: () => undefined, warn: () => undefined };
const MODELS = { openai: 'simulated-openai-image', gemini: 'simulated-gemini-image' } as const;

type ProviderId = 'openai' | 'gemini';

function profile(id: ProviderId, sim: SimulatorProcess, overrides: Partial<WorkerRuntimeConfig['imageProvider']> = {}): WorkerRuntimeConfig['imageProvider'] {
  return { id, mode: 'simulated', baseUrl: sim.baseUrl, apiKey: sim.apiKey, model: MODELS[id], ...overrides };
}

const context = (overrides: Partial<ProviderContext> = {}): ProviderContext => ({
  signal: new AbortController().signal,
  correlationId: 'corr-test',
  deadlineAt: new Date(Date.now() + 20_000).toISOString(),
  ...overrides,
});

async function solid(color: string, width = 96, height = 64): Promise<Uint8Array> {
  return new Uint8Array(await sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer());
}

async function decode(bytes: Uint8Array): Promise<{ width: number; height: number; format?: string }> {
  const { info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, format: (await sharp(bytes).metadata()).format };
}

async function failure(promise: Promise<unknown>): Promise<ProviderError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ProviderError) return error;
    throw error;
  }
  throw new Error('expected a ProviderError');
}

// One scenario table shared by both adapters.
interface ScenarioCase {
  scenario: string;
  code: ProviderErrorCode;
  outcomeUnknown: boolean;
  retryAfterMs?: number;
  httpStatus?: number;
}
const FAILURE_CASES: ScenarioCase[] = [
  { scenario: 'auth', code: 'PROVIDER_AUTH', outcomeUnknown: false },
  { scenario: 'permission', code: 'PROVIDER_AUTH', outcomeUnknown: false, httpStatus: 403 },
  { scenario: 'validation', code: 'INVALID_INPUT', outcomeUnknown: false, httpStatus: 400 },
  { scenario: 'rate_limit', code: 'PROVIDER_RATE_LIMITED', outcomeUnknown: false, retryAfterMs: 1000, httpStatus: 429 },
  { scenario: 'quota', code: 'PROVIDER_QUOTA_EXHAUSTED', outcomeUnknown: false, httpStatus: 429 },
  { scenario: 'unavailable', code: 'PROVIDER_UNAVAILABLE', outcomeUnknown: false, httpStatus: 503 },
  { scenario: 'reset', code: 'PROVIDER_OUTCOME_UNKNOWN', outcomeUnknown: true },
  { scenario: 'malformed', code: 'PROVIDER_MALFORMED_OUTPUT', outcomeUnknown: false, httpStatus: 200 },
  { scenario: 'malformed_base64', code: 'PROVIDER_MALFORMED_OUTPUT', outcomeUnknown: false, httpStatus: 200 },
  { scenario: 'truncated_image', code: 'PROVIDER_MALFORMED_OUTPUT', outcomeUnknown: false, httpStatus: 200 },
  { scenario: 'no_image', code: 'PROVIDER_NO_IMAGE', outcomeUnknown: false },
  { scenario: 'safety', code: 'PROVIDER_NO_IMAGE', outcomeUnknown: false },
];

describe.each<ProviderId>(['openai', 'gemini'])('%s adapter against the HTTP simulator', (id) => {
  let sim: SimulatorProcess;
  let provider: ImageProvider;

  const input = (overrides: Partial<ImageGenerationInput> = {}): ImageGenerationInput => ({
    modelId: MODELS[id],
    mode: 'text_to_image',
    prompt: 'A timber and glass house in morning light',
    width: 1024,
    height: 1024,
    quality: 'preview',
    ...overrides,
  });

  beforeAll(async () => {
    sim = await startSimulatorProcess();
    provider = createImageProvider(profile(id, sim), silentLogger);
  });
  afterAll(async () => {
    await sim.stop();
  });
  beforeEach(async () => {
    await sim.reset();
  });

  it('selects the adapter by configured id and reports capabilities without simulator-only fields', () => {
    expect(provider.id).toBe(id);
    expect(provider.capabilities).toMatchObject({ negativePrompt: false, seed: false, cancellation: false });
    expect(provider.capabilities.sizes).toContainEqual({ width: 1024, height: 1024 });
  });

  it('returns a decodable PNG of every advertised size with exactly one HTTP request each', async () => {
    for (const size of provider.capabilities.sizes) {
      await sim.reset();
      const output = await provider.generate(input({ ...size }), context());
      expect(output.images).toHaveLength(1);
      const [image] = output.images;
      expect(image.mimeType).toBe('image/png');
      expect(await decode(image.bytes)).toEqual({ width: size.width, height: size.height, format: 'png' });
      expect({ width: image.width, height: image.height }).toEqual(size);
      expect(output.usage).toEqual({ unit: 'image', quantity: 1, simulated: true });
      expect((await sim.requests()).received).toBe(1);
    }
  });

  it('is deterministic, and prompt and input image change the output', async () => {
    const a = await provider.generate(input(), context());
    const again = await provider.generate(input(), context());
    expect(Buffer.from(again.images[0].bytes).equals(Buffer.from(a.images[0].bytes))).toBe(true);
    const other = await provider.generate(input({ prompt: 'A brick warehouse at dusk' }), context());
    expect(Buffer.from(other.images[0].bytes).equals(Buffer.from(a.images[0].bytes))).toBe(false);

    await sim.reset();
    const red = { bytes: await solid('#d03030'), mimeType: 'image/png' };
    const blue = { bytes: await solid('#3030d0'), mimeType: 'image/png' };
    const withRed = await provider.generate(input({ mode: 'image_to_image', inputImage: red }), context());
    const withRedAgain = await provider.generate(input({ mode: 'sketch_to_image', inputImage: red }), context());
    const withBlue = await provider.generate(input({ mode: 'image_to_image', inputImage: blue }), context());
    const bytes = (output: typeof a) => Buffer.from(output.images[0].bytes);
    expect(await decode(withRed.images[0].bytes)).toMatchObject({ width: 1024, height: 1024 });
    expect(bytes(withRed).equals(bytes(withRedAgain))).toBe(true);
    expect(bytes(withRed).equals(bytes(a))).toBe(false);
    expect(bytes(withRed).equals(bytes(withBlue))).toBe(false);
    const routes = (await sim.requests()).byRoute;
    expect(id === 'openai' ? routes['openai.edits'] : routes['gemini.generateContent']).toBe(3);
  });

  it('rejects input that cannot be serialized before any request leaves the process', async () => {
    const png = { bytes: await solid('#808080'), mimeType: 'image/png' };
    const cases: Array<[ProviderErrorCode, ImageGenerationInput]> = [
      ['UNSUPPORTED_CAPABILITY', input({ width: 1000, height: 1000 })],
      ['INVALID_INPUT', input({ prompt: '   ' })],
      ['INVALID_INPUT', input({ mode: 'image_to_image' })],
      ['INVALID_INPUT', input({ inputImage: png })],
      ['INVALID_INPUT', input({ mode: 'image_to_image', inputImage: { bytes: png.bytes, mimeType: 'image/jpeg' } })],
      ['INVALID_INPUT', input({ mode: 'image_to_image', inputImage: { bytes: new Uint8Array([1, 2, 3, 4]), mimeType: 'image/png' } })],
    ];
    for (const [code, candidate] of cases) {
      const error = await failure(provider.generate(candidate, context()));
      expect(error.code).toBe(code);
      expect(error.outcomeUnknown).toBe(false);
    }
    expect((await sim.requests()).received).toBe(0);
  });

  it.each(FAILURE_CASES)('maps the $scenario scenario to $code after exactly one request', async (expected) => {
    await sim.scenario(expected.scenario);
    const error = await failure(provider.generate(input(), context()));
    expect(error.code).toBe(expected.code);
    expect(error.outcomeUnknown).toBe(expected.outcomeUnknown);
    expect(error.retryAfterMs).toBe(expected.retryAfterMs);
    if (expected.httpStatus) expect(error.httpStatus).toBe(expected.httpStatus);
    expect(error.message).not.toContain(sim.apiKey);
    expect(error.message).not.toContain('timber');
    expect((await sim.requests()).received).toBe(1);
  });

  it('never retries: a transient fault is surfaced once and the next call is a fresh attempt', async () => {
    await sim.scenario('unavailable', { times: 1, then: 'success' });
    const error = await failure(provider.generate(input(), context()));
    expect(error.code).toBe('PROVIDER_UNAVAILABLE');
    expect((await sim.requests()).received).toBe(1);
    const output = await provider.generate(input(), context());
    expect(output.images).toHaveLength(1);
    expect((await sim.requests()).received).toBe(2);
  });

  it('rejects a wrong key as PROVIDER_AUTH without falling back or retrying', async () => {
    const wrong = createImageProvider(profile(id, sim, { apiKey: 'sim-local-not-the-real-key-000000' }), silentLogger);
    const error = await failure(wrong.generate(input(), context()));
    expect(error).toMatchObject({ code: 'PROVIDER_AUTH', outcomeUnknown: false });
    expect(error.message).not.toContain('not-the-real-key');
    expect((await sim.requests()).received).toBe(1);
  });

  it('treats a deadline that fires while waiting as an unknown paid outcome', async () => {
    await sim.scenario('timeout');
    const startedAt = Date.now();
    const error = await failure(provider.generate(input(), context({ deadlineAt: new Date(Date.now() + 400).toISOString() })));
    expect(error).toMatchObject({ code: 'PROVIDER_OUTCOME_UNKNOWN', outcomeUnknown: true });
    expect(Date.now() - startedAt).toBeLessThan(3000);
    expect((await sim.requests()).received).toBe(1);
  });

  it('separates logical cancellation from unknown outcomes and sends nothing when already cancelled', async () => {
    await sim.scenario('timeout');
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 150);
    const midFlight = await failure(provider.generate(input(), context({ signal: controller.signal })));
    expect(midFlight).toMatchObject({ code: 'CANCELLED', outcomeUnknown: true });
    expect((await sim.requests()).received).toBe(1);

    await sim.reset();
    const cancelled = new AbortController();
    cancelled.abort();
    const before = await failure(provider.generate(input(), context({ signal: cancelled.signal })));
    expect(before).toMatchObject({ code: 'CANCELLED', outcomeUnknown: false });
    expect((await sim.requests()).received).toBe(0);
  });

  it('does not send a request when the deadline already elapsed', async () => {
    const error = await failure(provider.generate(input(), context({ deadlineAt: new Date(Date.now() - 1).toISOString() })));
    expect(error).toMatchObject({ code: 'PROVIDER_UNAVAILABLE', outcomeUnknown: false });
    expect((await sim.requests()).received).toBe(0);
  });

  it('reports an unreachable endpoint as a known, pre-send failure', async () => {
    const dead = await startSimulatorProcess();
    const deadUrl = dead.baseUrl;
    await dead.stop();
    const unreachable = createImageProvider(profile(id, sim, { baseUrl: deadUrl }), silentLogger);
    const error = await failure(unreachable.generate(input(), context()));
    expect(error).toMatchObject({ code: 'PROVIDER_UNAVAILABLE', outcomeUnknown: false });
  });

  it('bounds the response size it is willing to read', async () => {
    const small = createImageProvider(profile(id, sim), silentLogger);
    expect(small).toBeDefined();
    const { OpenAiImageProvider } = await import('./openai/openai-image.provider');
    const { GeminiImageProvider } = await import('./gemini/gemini-image.provider');
    const Provider = id === 'openai' ? OpenAiImageProvider : GeminiImageProvider;
    const tiny = new Provider({ baseUrl: sim.baseUrl, apiKey: sim.apiKey, model: MODELS[id], simulated: true, logger: silentLogger, maxResponseBytes: 1024 });
    const error = await failure(tiny.generate(input(), context()));
    expect(error.code).toBe('PROVIDER_MALFORMED_OUTPUT');
  });
});

describe('provider registry', () => {
  const base = { mode: 'simulated' as const, baseUrl: 'http://127.0.0.1:1', apiKey: 'sim-local-x', model: 'simulated-openai-image' };

  it('selects strictly by id, ignoring the key prefix', () => {
    expect(createImageProvider({ ...base, id: 'gemini', apiKey: 'sk-looks-like-openai' }, silentLogger).id).toBe('gemini');
    expect(createImageProvider({ ...base, id: 'openai', apiKey: 'AIza-looks-like-google' }, silentLogger).id).toBe('openai');
  });

  it('rejects unknown ids and malformed base URLs instead of falling back', () => {
    expect(() => createImageProvider({ ...base, id: 'other' as never }, silentLogger)).toThrow('Unsupported image provider id');
    expect(() => createImageProvider({ ...base, id: 'openai', baseUrl: 'not a url' }, silentLogger)).toThrow('valid URL');
    expect(() => createImageProvider({ ...base, id: 'openai', baseUrl: 'https://user:pw@example.com' }, silentLogger)).toThrow('credentials');
  });
});
