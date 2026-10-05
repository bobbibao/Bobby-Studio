import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { readFileSync } from 'fs';
import * as path from 'path';
import { CreateGenerationDto, MAX_PROMPT_CHARS, parseWorkerEvent } from '.';

const fixture = <T>(name: string): T =>
  JSON.parse(readFileSync(path.resolve(__dirname, '../../../../../contracts/v1', name), 'utf8')) as T;

const validateRequest = async (body: unknown) =>
  validate(plainToInstance(CreateGenerationDto, body), { whitelist: true, forbidNonWhitelisted: true });

describe('generation contracts v1', () => {
  it('accepts the shared create-generation fixture', async () => {
    expect(await validateRequest(fixture('create-generation.request.json'))).toHaveLength(0);
  });

  it.each([
    ['a client-supplied user id', { userId: 'someone-else' }],
    ['a client-supplied price', { creditCost: 0 }],
    ['an API key', { apiKey: 'x' }],
    ['an endpoint', { endpoint: 'http://example.test' }],
    ['a connector function name', { connectorFunction: 'eval' }],
  ])('rejects %s instead of ignoring it', async (_name, extra) => {
    const errors = await validateRequest({ ...fixture<object>('create-generation.request.json'), ...extra });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('bounds the prompt and trims it', async () => {
    const base = fixture<Record<string, unknown>>('create-generation.request.json');
    expect(await validateRequest({ ...base, prompt: '   ' })).not.toHaveLength(0);
    expect(await validateRequest({ ...base, prompt: 'x'.repeat(MAX_PROMPT_CHARS + 1) })).not.toHaveLength(0);
    const dto = plainToInstance(CreateGenerationDto, { ...base, prompt: '  roof  ' });
    expect(dto.prompt).toBe('roof');
  });

  it('accepts the shared worker completion fixture and rejects mutations before any effect', () => {
    const event = fixture<Record<string, any>>('worker-event.completed.json');
    expect(parseWorkerEvent(event).type).toBe('completed');

    const mutations: Array<[string, (e: Record<string, any>) => void]> = [
      ['unknown schema version', (e) => (e.schemaVersion = 2)],
      ['unknown type', (e) => (e.type = 'exploded')],
      ['non-UUID job id', (e) => (e.jobId = '123')],
      ['missing run token', (e) => delete e.runToken],
      ['no outputs', (e) => (e.data.outputs = [])],
      ['path traversal in storage key', (e) => (e.data.outputs[0].storageKey = '../../etc/passwd')],
      ['non-image mime type', (e) => (e.data.outputs[0].mimeType = 'text/html')],
    ];
    for (const [name, mutate] of mutations) {
      const copy = JSON.parse(JSON.stringify(event));
      mutate(copy);
      expect(() => parseWorkerEvent(copy)).toThrow(BadRequestException);
      void name;
    }
  });

  it('validates failed events against the normalized error vocabulary', () => {
    const base = fixture<Record<string, any>>('worker-event.completed.json');
    const failed = { ...base, type: 'failed', data: { errorCode: 'PROVIDER_RATE_LIMITED', message: 'slow down', retryable: true, outcomeUnknown: false } };
    expect(parseWorkerEvent(failed).type).toBe('failed');
    expect(() => parseWorkerEvent({ ...failed, data: { ...failed.data, errorCode: 'MADE_UP' } })).toThrow(BadRequestException);
  });
});

describe('contract mirrors', () => {
  const root = path.resolve(__dirname, '../../../../..');
  const source = readFileSync(path.join(__dirname, 'generation.contracts.ts'), 'utf8');

  it.each([
    ['worker', 'worker/src/contracts/generation.contracts.ts'],
    ['frontend', 'frontend/src/features/generation/contracts.ts'],
  ])('keeps the %s copy identical to the API contract', (_name, relative) => {
    expect(readFileSync(path.join(root, relative), 'utf8')).toBe(source);
  });
});
