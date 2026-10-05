import sharp from 'sharp';
import { SCENARIOS } from '../src/scenarios';
import { bearer, control, dimensions, KEY, solidImage, startSimulator, type RunningSimulator } from './helpers';

let sim: RunningSimulator;
const MODEL_OPENAI = 'simulated-openai-image';
const MODEL_GEMINI = 'simulated-gemini-image';

beforeAll(async () => {
  sim = await startSimulator();
});
afterAll(async () => {
  await sim.close();
});
beforeEach(async () => {
  await fetch(`${sim.baseUrl}/__sim/reset`, { method: 'POST', headers: bearer() });
});

const openAiGenerate = (body: Record<string, unknown>, headers: Record<string, string> = {}, key = KEY) =>
  fetch(`${sim.baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: { ...bearer(key), 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ model: MODEL_OPENAI, prompt: 'a timber house', size: '1024x1024', quality: 'low', n: 1, output_format: 'png', ...body }),
  });

function openAiEditForm(image: Buffer | null, fields: Record<string, string> = {}, imageField = 'image', mimeType = 'image/png'): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries({ model: MODEL_OPENAI, prompt: 'make it warmer', size: '1024x1024', quality: 'low', ...fields })) form.set(key, value);
  if (image) form.append(imageField, new Blob([new Uint8Array(image)], { type: mimeType }), 'input.png');
  return form;
}
const openAiEdit = (form: FormData, headers: Record<string, string> = {}) => fetch(`${sim.baseUrl}/v1/images/edits`, { method: 'POST', headers: { ...bearer(), ...headers }, body: form });

interface GeminiBody {
  prompt?: string;
  image?: Buffer;
  imageMime?: string;
  generationConfig?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}
const geminiBody = ({ prompt = 'a timber house', image, imageMime = 'image/png', generationConfig, extra }: GeminiBody = {}) => ({
  contents: [{ role: 'user', parts: [{ text: prompt }, ...(image ? [{ inlineData: { mimeType: imageMime, data: image.toString('base64') } }] : [])] }],
  generationConfig: generationConfig ?? { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } },
  ...extra,
});
const geminiGenerate = (body: unknown, headers: Record<string, string> = {}, model = MODEL_GEMINI) =>
  fetch(`${sim.baseUrl}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

async function openAiImage(response: Response): Promise<Buffer> {
  expect(response.status).toBe(200);
  const json = (await response.json()) as { data: Array<{ b64_json: string }> };
  return Buffer.from(json.data[0].b64_json, 'base64');
}
async function geminiImage(response: Response): Promise<Buffer> {
  expect(response.status).toBe(200);
  const json = (await response.json()) as { candidates: Array<{ content: { parts: Array<{ inlineData?: { data: string } }> } }> };
  const part = json.candidates[0].content.parts.find((p) => p.inlineData);
  return Buffer.from(part!.inlineData!.data, 'base64');
}

describe('health', () => {
  it('answers without a key and exposes no secrets', async () => {
    const response = await fetch(`${sim.baseUrl}/health`);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ status: 'ok', simulated: true });
    expect(text).not.toContain(KEY);
  });
});

describe('OpenAI facade', () => {
  it.each([
    ['1024x1024', 1024, 1024],
    ['1536x1024', 1536, 1024],
    ['1024x1536', 1024, 1536],
  ])('generations render a decodable PNG of exactly %s', async (size, width, height) => {
    const response = await openAiGenerate({ size });
    expect(response.headers.get('x-request-id')).toMatch(/^req_/);
    expect(response.headers.get('x-bobby-simulated')).toBe('true');
    const png = await openAiImage(response);
    expect(await dimensions(png)).toEqual({ width, height, format: 'png' });
  });

  it('is deterministic and sensitive to prompt, quality and size', async () => {
    const a = await openAiImage(await openAiGenerate({}));
    const again = await openAiImage(await openAiGenerate({}));
    expect(again.equals(a)).toBe(true);
    for (const change of [{ prompt: 'a glass house' }, { quality: 'high' }, { size: '1536x1024' }]) {
      expect((await openAiImage(await openAiGenerate(change))).equals(a)).toBe(false);
    }
    // 'auto' quality is documented here as medium.
    const auto = await openAiImage(await openAiGenerate({ quality: 'auto' }));
    const medium = await openAiImage(await openAiGenerate({ quality: 'medium' }));
    expect(auto.equals(medium)).toBe(true);
  });

  it('edits accept one image (image or image[]), validate it, and let it change the output', async () => {
    const red = await solidImage(96, 64, '#d03030');
    const blue = await solidImage(96, 64, '#3030d0');
    const withRed = await openAiImage(await openAiEdit(openAiEditForm(red)));
    expect(await dimensions(withRed)).toEqual({ width: 1024, height: 1024, format: 'png' });
    expect((await openAiImage(await openAiEdit(openAiEditForm(red)))).equals(withRed)).toBe(true);
    expect((await openAiImage(await openAiEdit(openAiEditForm(red, {}, 'image[]')))).equals(withRed)).toBe(true);
    expect((await openAiImage(await openAiEdit(openAiEditForm(blue)))).equals(withRed)).toBe(false);
    const textOnly = await openAiImage(await openAiGenerate({ prompt: 'make it warmer' }));
    expect(textOnly.equals(withRed)).toBe(false);
    const jpeg = await solidImage(96, 64, '#d03030', 'jpeg');
    expect(await dimensions(await openAiImage(await openAiEdit(openAiEditForm(jpeg, {}, 'image', 'image/jpeg'))))).toMatchObject({ width: 1024 });
  });

  it.each([
    ['wrong key', 'Bearer wrong-key-value', 'invalid_api_key'],
    ['missing key', undefined, null],
  ])('rejects a %s with the OpenAI auth error shape', async (_name, authorization, code) => {
    const response = await fetch(`${sim.baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
      body: JSON.stringify({ model: MODEL_OPENAI, prompt: 'x' }),
    });
    expect(response.status).toBe(401);
    const text = await response.text();
    expect(text).not.toContain('wrong-key-value');
    expect(JSON.parse(text)).toEqual({ error: { message: expect.any(String), type: 'invalid_request_error', param: null, code } });
  });

  it.each([
    ['unknown field', { surprise: 1 }, 'unknown_parameter'],
    ['stream', { stream: true }, 'unsupported_parameter'],
    ['response_format url', { response_format: 'url' }, 'unsupported_parameter'],
    ['mask', { mask: 'x' }, 'unsupported_parameter'],
    ['n != 1', { n: 2 }, 'invalid_value'],
    ['unsupported size', { size: '512x512' }, 'invalid_value'],
    ['unsupported quality', { quality: 'ultra' }, 'invalid_value'],
    ['jpeg output', { output_format: 'jpeg' }, 'invalid_value'],
    ['unknown model', { model: 'gpt-image-1' }, 'model_not_found'],
    ['empty prompt', { prompt: '  ' }, 'missing_required_parameter'],
  ])('rejects %s with an OpenAI invalid_request_error', async (_name, change, code) => {
    const response = await openAiGenerate(change);
    expect([400, 404]).toContain(response.status);
    const body = (await response.json()) as { error: { type: string; code: string; param: string | null } };
    expect(body.error.type).toBe('invalid_request_error');
    expect(body.error.code).toBe(code);
  });

  it('rejects edits with zero or two images, masks and undecodable data', async () => {
    const png = await solidImage(32, 32, '#808080');
    expect((await openAiEdit(openAiEditForm(null))).status).toBe(400);
    const two = openAiEditForm(png);
    two.append('image[]', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'second.png');
    expect((await openAiEdit(two)).status).toBe(400);
    const masked = openAiEditForm(png);
    masked.append('mask', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'mask.png');
    expect(((await (await openAiEdit(masked)).json()) as { error: { code: string } }).error.code).toBe('unsupported_parameter');
    const broken = await openAiEdit(openAiEditForm(Buffer.from('not an image at all')));
    expect(((await broken.json()) as { error: { code: string } }).error.code).toBe('invalid_image');
    const json = await fetch(`${sim.baseUrl}/v1/images/edits`, { method: 'POST', headers: { ...bearer(), 'content-type': 'application/json' }, body: '{}' });
    expect(json.status).toBe(400);
  });
});

describe('Gemini facade', () => {
  it.each([
    ['1:1', 1024, 1024],
    ['16:9', 1344, 768],
    ['2:3', 832, 1248],
  ])('renders a decodable PNG for aspect ratio %s with image and text parts', async (aspectRatio, width, height) => {
    const response = await geminiGenerate(geminiBody({ generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio } } }));
    expect(response.headers.get('x-bobby-simulated')).toBe('true');
    const clone = response.clone();
    expect(await dimensions(await geminiImage(response))).toEqual({ width, height, format: 'png' });
    const json = (await clone.json()) as { candidates: Array<{ finishReason: string; content: { parts: unknown[] } }>; usageMetadata: { totalTokenCount: number } };
    expect(json.candidates[0].finishReason).toBe('STOP');
    expect(json.candidates[0].content.parts).toHaveLength(2);
    expect(json.usageMetadata.totalTokenCount).toBeGreaterThan(0);
  });

  it('omits the text part for IMAGE-only output and accepts ?key=', async () => {
    const response = await fetch(`${sim.baseUrl}/v1beta/models/${MODEL_GEMINI}:generateContent?key=${KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(geminiBody({ generationConfig: { responseModalities: ['IMAGE'] } })),
    });
    const clone = response.clone();
    await geminiImage(response);
    const json = (await clone.json()) as { candidates: Array<{ content: { parts: unknown[] } }> };
    expect(json.candidates[0].content.parts).toHaveLength(1);
  });

  it('is deterministic and sensitive to prompt, aspect ratio and input image', async () => {
    const red = await solidImage(80, 80, '#d03030');
    const blue = await solidImage(80, 80, '#3030d0');
    const base = await geminiImage(await geminiGenerate(geminiBody()));
    expect((await geminiImage(await geminiGenerate(geminiBody()))).equals(base)).toBe(true);
    expect((await geminiImage(await geminiGenerate(geminiBody({ prompt: 'a glass house' })))).equals(base)).toBe(false);
    const wide = geminiBody({ generationConfig: { imageConfig: { aspectRatio: '4:3' } } });
    expect((await geminiImage(await geminiGenerate(wide))).equals(base)).toBe(false);
    const edited = await geminiImage(await geminiGenerate(geminiBody({ image: red })));
    expect((await geminiImage(await geminiGenerate(geminiBody({ image: red })))).equals(edited)).toBe(true);
    expect(edited.equals(base)).toBe(false);
    expect((await geminiImage(await geminiGenerate(geminiBody({ image: blue })))).equals(edited)).toBe(false);
  });

  it('rejects an invalid key with API_KEY_INVALID and a missing key with PERMISSION_DENIED', async () => {
    const wrong = await geminiGenerate(geminiBody(), { 'x-goog-api-key': 'wrong-key-value' });
    expect(wrong.status).toBe(400);
    const wrongText = await wrong.text();
    expect(wrongText).not.toContain('wrong-key-value');
    const wrongBody = JSON.parse(wrongText) as { error: { code: number; status: string; details: Array<{ reason: string }> } };
    expect(wrongBody.error).toMatchObject({ code: 400, status: 'INVALID_ARGUMENT' });
    expect(wrongBody.error.details[0].reason).toBe('API_KEY_INVALID');
    const missing = await fetch(`${sim.baseUrl}/v1beta/models/${MODEL_GEMINI}:generateContent`, { method: 'POST', body: '{}' });
    expect(missing.status).toBe(403);
    expect(((await missing.json()) as { error: { status: string } }).error.status).toBe('PERMISSION_DENIED');
  });

  it.each([
    ['unknown top-level field', geminiBody({ extra: { surprise: 1 } })],
    ['tools', geminiBody({ extra: { tools: [] } })],
    ['systemInstruction', geminiBody({ extra: { systemInstruction: { parts: [{ text: 'x' }] } } })],
    ['OpenAI size field', geminiBody({ generationConfig: { imageConfig: { aspectRatio: '1:1' }, size: '1024x1024' } })],
    ['imageSize', geminiBody({ generationConfig: { imageConfig: { imageSize: '2K' } } })],
    ['unsupported aspect ratio', geminiBody({ generationConfig: { imageConfig: { aspectRatio: '21:9' } } })],
    ['text-only modalities', geminiBody({ generationConfig: { responseModalities: ['TEXT'] } })],
    ['no text part', { contents: [{ parts: [] }] }],
    ['two contents', { contents: [{ parts: [{ text: 'a' }] }, { parts: [{ text: 'b' }] }] }],
    ['bad base64', { contents: [{ parts: [{ text: 'a' }, { inlineData: { mimeType: 'image/png', data: '%%%' } }] }] }],
    ['wrong mime type', { contents: [{ parts: [{ text: 'a' }, { inlineData: { mimeType: 'image/gif', data: 'AAAA' } }] }] }],
    ['not an image', { contents: [{ parts: [{ text: 'a' }, { inlineData: { mimeType: 'image/png', data: Buffer.from('not an image').toString('base64') } }] }] }],
  ])('rejects %s with INVALID_ARGUMENT', async (_name, body) => {
    const response = await geminiGenerate(body);
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: { status: string } }).error.status).toBe('INVALID_ARGUMENT');
  });

  it('answers 404 NOT_FOUND for an unknown model', async () => {
    const response = await geminiGenerate(geminiBody(), {}, 'gemini-2.5-flash-image');
    expect(response.status).toBe(404);
    expect(((await response.json()) as { error: { status: string } }).error.status).toBe('NOT_FOUND');
  });
});

describe('fault scenarios (per-request header)', () => {
  const header = (name: string) => ({ 'x-bobby-simulator-scenario': name });

  interface Expectation {
    openai: { status: number; code?: string | null; type?: string; retryAfter?: string };
    gemini: { status: number; errorStatus?: string; retryAfter?: string };
  }
  const table: Record<string, Expectation> = {
    auth: { openai: { status: 401, code: 'invalid_api_key' }, gemini: { status: 400, errorStatus: 'INVALID_ARGUMENT' } },
    permission: { openai: { status: 403, code: 'permission_denied' }, gemini: { status: 403, errorStatus: 'PERMISSION_DENIED' } },
    validation: { openai: { status: 400, code: 'invalid_value' }, gemini: { status: 400, errorStatus: 'INVALID_ARGUMENT' } },
    rate_limit: { openai: { status: 429, code: 'rate_limit_exceeded', retryAfter: '1' }, gemini: { status: 429, errorStatus: 'RESOURCE_EXHAUSTED', retryAfter: '1' } },
    quota: { openai: { status: 429, code: 'insufficient_quota', type: 'insufficient_quota' }, gemini: { status: 429, errorStatus: 'RESOURCE_EXHAUSTED' } },
    unavailable: { openai: { status: 503, type: 'server_error' }, gemini: { status: 503, errorStatus: 'UNAVAILABLE' } },
  };

  it.each(Object.keys(table))('%s returns each facade\'s native error', async (name) => {
    const expected = table[name];
    const openai = await openAiGenerate({}, header(name));
    expect(openai.status).toBe(expected.openai.status);
    expect(openai.headers.get('retry-after')).toBe(expected.openai.retryAfter ?? null);
    const openaiBody = (await openai.json()) as { error: { code: string | null; type: string } };
    if (expected.openai.code !== undefined) expect(openaiBody.error.code).toBe(expected.openai.code);
    if (expected.openai.type) expect(openaiBody.error.type).toBe(expected.openai.type);

    const gemini = await geminiGenerate(geminiBody(), header(name));
    expect(gemini.status).toBe(expected.gemini.status);
    expect(gemini.headers.get('retry-after')).toBe(expected.gemini.retryAfter ?? null);
    const geminiJson = (await gemini.json()) as { error: { code: number; status: string } };
    expect(geminiJson.error.code).toBe(expected.gemini.status);
    expect(geminiJson.error.status).toBe(expected.gemini.errorStatus);
  });

  it('quota and rate limit stay distinguishable on both facades', async () => {
    const openaiQuota = (await (await openAiGenerate({}, header('quota'))).json()) as { error: { code: string } };
    const openaiRate = (await (await openAiGenerate({}, header('rate_limit'))).json()) as { error: { code: string } };
    expect(openaiQuota.error.code).not.toBe(openaiRate.error.code);
    const geminiQuota = await geminiGenerate(geminiBody(), header('quota'));
    const geminiRate = await geminiGenerate(geminiBody(), header('rate_limit'));
    expect(geminiQuota.headers.get('retry-after')).toBeNull();
    expect(geminiRate.headers.get('retry-after')).toBe('1');
  });

  it('no_image and safety return 200/400 without an image', async () => {
    const empty = (await (await openAiGenerate({}, header('no_image'))).json()) as { data: unknown[] };
    expect(empty.data).toEqual([]);
    const blocked = await openAiGenerate({}, header('safety'));
    expect(blocked.status).toBe(400);
    expect(((await blocked.json()) as { error: { code: string } }).error.code).toBe('moderation_blocked');

    const textOnly = (await (await geminiGenerate(geminiBody(), header('no_image'))).json()) as { candidates: Array<{ finishReason: string; content: { parts: Array<{ inlineData?: unknown }> } }> };
    expect(textOnly.candidates[0].finishReason).toBe('STOP');
    expect(textOnly.candidates[0].content.parts.some((p) => p.inlineData)).toBe(false);
    const safety = await geminiGenerate(geminiBody(), header('safety'));
    expect(safety.status).toBe(200);
    const safetyJson = (await safety.json()) as { candidates: Array<{ finishReason: string; content?: unknown }> };
    expect(safetyJson.candidates[0]).toMatchObject({ finishReason: 'IMAGE_SAFETY' });
    expect(safetyJson.candidates[0].content).toBeUndefined();
  });

  it('malformed variants return 200 with undecodable image data', async () => {
    for (const name of ['malformed', 'malformed_base64', 'truncated_image']) {
      const openai = (await (await openAiGenerate({}, header(name))).json()) as { data: Array<{ b64_json: string }> };
      const gemini = (await (await geminiGenerate(geminiBody(), header(name))).json()) as { candidates: Array<{ content: { parts: Array<{ inlineData?: { data: string } }> } }> };
      const payloads = [openai.data[0].b64_json, gemini.candidates[0].content.parts.find((p) => p.inlineData)!.inlineData!.data];
      for (const payload of payloads) {
        if (name === 'malformed_base64') {
          expect(payload).not.toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
        } else {
          await expect(dimensions(Buffer.from(payload, 'base64'))).rejects.toThrow();
        }
      }
    }
  });

  it('reset destroys the connection', async () => {
    await expect(openAiGenerate({}, header('reset'))).rejects.toThrow();
    await expect(geminiGenerate(geminiBody(), header('reset'))).rejects.toThrow();
  });

  it('timeout holds the connection until the client gives up, and the simulator notices the abort', async () => {
    const controller = new AbortController();
    const pending = fetch(`${sim.baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json', ...header('timeout') },
      body: JSON.stringify({ model: MODEL_OPENAI, prompt: 'x' }),
      signal: controller.signal,
    });
    const outcome = await Promise.race([pending.then(() => 'answered', () => 'aborted'), new Promise((resolve) => setTimeout(() => resolve('held'), 300))]);
    expect(outcome).toBe('held');
    controller.abort();
    await expect(pending).rejects.toThrow();
    const entry = await waitForLogEntry((e) => e.scenario === 'timeout');
    expect(entry.status).toBeNull();
  });

  it('per-request latency is honored, capped, and cancelled with the client', async () => {
    const started = Date.now();
    await openAiImage(await openAiGenerate({}, { 'x-bobby-simulator-latency-ms': '250' }));
    expect(Date.now() - started).toBeGreaterThanOrEqual(240);
    const tooHigh = await openAiGenerate({}, { 'x-bobby-simulator-latency-ms': '999999' });
    expect(tooHigh.status).toBe(400);

    const controller = new AbortController();
    const pending = openAiGenerate({}, { 'x-bobby-simulator-latency-ms': '20000' });
    void pending.catch(() => undefined);
    const slow = fetch(`${sim.baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json', 'x-bobby-simulator-latency-ms': '20000' },
      body: JSON.stringify({ model: MODEL_OPENAI, prompt: 'slow' }),
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 100);
    await expect(slow).rejects.toThrow();
    await waitForLogEntry((e) => e.status === null && e.scenario === 'success');
  });

  it('rejects malformed scenario headers instead of silently succeeding', async () => {
    expect((await openAiGenerate({}, header('bogus'))).status).toBe(400);
    expect((await openAiGenerate({}, header('quota:0'))).status).toBe(400);
    expect((await geminiGenerate(geminiBody(), header('quota:x'))).status).toBe(400);
  });

  it('name:n faults the first n requests with the same header value, then succeeds', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await openAiGenerate({}, header('unavailable:2'))).status);
    expect(statuses).toEqual([503, 503, 200, 200]);
  });
});

describe('scenario control endpoint', () => {
  const post = (path: string, body: unknown, key = KEY) => control(`${sim.baseUrl}${path}`, body, key);

  it('requires the simulator key', async () => {
    expect((await post('/__sim/scenario', { scenario: 'quota' }, 'wrong-key-value-123')).status).toBe(401);
    expect((await fetch(`${sim.baseUrl}/__sim/scenario`, { method: 'POST', body: '{}' })).status).toBe(401);
    expect((await fetch(`${sim.baseUrl}/__sim/reset`, { method: 'POST' })).status).toBe(401);
    expect((await fetch(`${sim.baseUrl}/__sim/requests`)).status).toBe(401);
    // An unauthenticated attempt must not have changed behavior.
    expect((await openAiGenerate({})).status).toBe(200);
  });

  it('applies a scenario for N requests, then falls back to `then`, and reset restores success', async () => {
    expect((await post('/__sim/scenario', { scenario: 'rate_limit', times: 2, then: 'success' })).status).toBe(200);
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await openAiGenerate({})).status);
    expect(statuses).toEqual([429, 429, 200, 200]);

    await post('/__sim/scenario', { scenario: 'unavailable', times: 1, then: 'quota' });
    expect([(await geminiGenerate(geminiBody())).status, (await geminiGenerate(geminiBody())).status]).toEqual([503, 429]);

    await post('/__sim/scenario', { scenario: 'permission' });
    expect((await openAiGenerate({})).status).toBe(403);
    expect((await openAiGenerate({})).status).toBe(403);
    expect((await post('/__sim/reset', {})).status).toBe(200);
    expect((await openAiGenerate({})).status).toBe(200);
  });

  it('lets a per-request header override the global scenario', async () => {
    await post('/__sim/scenario', { scenario: 'unavailable' });
    expect((await openAiGenerate({})).status).toBe(503);
    expect((await openAiGenerate({}, { 'x-bobby-simulator-scenario': 'success' })).status).toBe(200);
  });

  it('rejects invalid control bodies', async () => {
    for (const body of [{ scenario: 'nope' }, { scenario: 'quota', times: 0 }, { scenario: 'quota', then: 'nope' }, { scenario: 'quota', extra: 1 }]) {
      expect((await post('/__sim/scenario', body)).status).toBe(400);
    }
  });

  it('counts facade requests per route for bounded-call assertions', async () => {
    await openAiGenerate({});
    await openAiGenerate({}, header401());
    await geminiGenerate(geminiBody());
    const stats = (await (await fetch(`${sim.baseUrl}/__sim/requests`, { headers: bearer() })).json()) as { received: number; byRoute: Record<string, number> };
    expect(stats.received).toBe(3);
    expect(stats.byRoute).toEqual({ 'openai.generations': 2, 'gemini.generateContent': 1 });
  });
});

function header401(): Record<string, string> {
  return { 'x-bobby-simulator-scenario': 'auth' };
}

async function waitForLogEntry(predicate: (entry: { scenario: string | null; status: number | null }) => boolean): Promise<{ scenario: string | null; status: number | null }> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const stats = (await (await fetch(`${sim.baseUrl}/__sim/requests`, { headers: bearer() })).json()) as { recent: Array<{ scenario: string | null; status: number | null }> };
    const found = stats.recent.find(predicate);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('expected request log entry did not appear');
}

describe('limits', () => {
  it('rejects oversized bodies with 413 on both facades without crashing', async () => {
    const big = Buffer.alloc(16 * 1024 * 1024 + 1024, 97);
    const openai = await fetch(`${sim.baseUrl}/v1/images/generations`, { method: 'POST', headers: { ...bearer(), 'content-type': 'application/json' }, body: big });
    expect(openai.status).toBe(413);
    const gemini = await fetch(`${sim.baseUrl}/v1beta/models/${MODEL_GEMINI}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json' }, body: big });
    expect(gemini.status).toBe(413);
    expect(((await gemini.json()) as { error: { status: string } }).error.status).toBe('INVALID_ARGUMENT');
    expect((await fetch(`${sim.baseUrl}/health`)).status).toBe(200);
  });

  it('rejects input images above 10 MiB and above 16 megapixels without decoding them', async () => {
    const huge = Buffer.concat([await solidImage(8, 8, '#000000'), Buffer.alloc(10 * 1024 * 1024 + 1)]);
    expect((await openAiEdit(openAiEditForm(huge))).status).toBe(400);
    expect((await geminiGenerate(geminiBody({ image: huge }))).status).toBe(400);

    const wide = await sharp({ create: { width: 5000, height: 4000, channels: 3, background: '#101010' } }).png({ compressionLevel: 9 }).toBuffer();
    expect(wide.length).toBeLessThan(10 * 1024 * 1024);
    const edit = await openAiEdit(openAiEditForm(wide));
    expect(edit.status).toBe(400);
    expect(((await edit.json()) as { error: { code: string } }).error.code).toBe('invalid_image');
    expect((await geminiGenerate(geminiBody({ image: wide }))).status).toBe(400);
  });

  it('never exposes the key in any error body', async () => {
    const texts: string[] = [];
    for (const name of SCENARIOS) texts.push(await (await openAiGenerate({}, { 'x-bobby-simulator-scenario': name === 'reset' || name === 'timeout' ? 'success' : name })).text());
    expect(texts.join('')).not.toContain(KEY);
  });
});

describe('routing', () => {
  it('answers 404 for unknown routes and 405 for wrong methods', async () => {
    expect((await fetch(`${sim.baseUrl}/v1/chat/completions`, { method: 'POST' })).status).toBe(404);
    expect((await fetch(`${sim.baseUrl}/v1/images/generations`)).status).toBe(405);
  });
});
