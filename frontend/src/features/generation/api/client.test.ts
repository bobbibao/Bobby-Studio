import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api/client', () => ({ apiClient: http, default: http }));

import { GenerationApiClient } from './client';

const body = {
  studioSessionId: 's1',
  clientRevision: 3,
  intent: 'preview' as const,
  modelId: 'm',
  mode: 'text_to_image' as const,
  prompt: 'house',
  size: { width: 1024, height: 1024 },
  quality: 'preview' as const,
};

describe('GenerationApiClient (axios boundary)', () => {
  beforeEach(() => {
    http.get.mockReset();
    http.post.mockReset();
    http.post.mockResolvedValue({ data: { ok: true } });
    http.get.mockResolvedValue({ data: { ok: true } });
  });

  it('sends the Idempotency-Key header with the submit intent and posts to /generations', async () => {
    await new GenerationApiClient().createGeneration(body, 'key-123');
    expect(http.post).toHaveBeenCalledTimes(1);
    const [path, payload, config] = http.post.mock.calls[0];
    expect(path).toBe('/generations');
    expect(payload).toEqual(body);
    expect(config.headers['Idempotency-Key']).toBe('key-123');
    expect(config.signal).toBeUndefined(); // the submit is never aborted by the browser
  });

  it('retry carries its own new key and uploads use the multipart field "file"', async () => {
    const client = new GenerationApiClient();
    await client.retryGeneration('job-1', 'retry-key');
    expect(http.post.mock.calls[0][0]).toBe('/generations/job-1/retry');
    expect(http.post.mock.calls[0][2].headers['Idempotency-Key']).toBe('retry-key');

    http.post.mockClear();
    await client.uploadImage(new File(['x'], 'ref.png', { type: 'image/png' }));
    const [path, form] = http.post.mock.calls[0];
    expect(path).toBe('/uploads');
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get('file')).toBeInstanceOf(File);
  });

  it('cancel, save, snapshot and catalog use the documented endpoints', async () => {
    const client = new GenerationApiClient();
    await client.cancelGeneration('a b');
    await client.saveGeneration('job-1');
    await client.getGeneration('job-1');
    await client.getCatalog();
    await client.getCreditBalance();
    await client.createStudioSession();
    expect(http.post.mock.calls.map((call) => call[0])).toEqual(['/generations/a%20b/cancel', '/generations/job-1/save', '/studio-sessions']);
    expect(http.get.mock.calls.map((call) => call[0])).toEqual(['/generations/job-1', '/models', '/credits/balance']);
  });
});
