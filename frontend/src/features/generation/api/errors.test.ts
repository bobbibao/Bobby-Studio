import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { isGenerationUpdatedEvent } from './guards';
import { parseRetryAfter, toApiProblem } from './errors';

function httpError(status: number, data: unknown, headers: Record<string, string> = {}): AxiosError {
  const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() };
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, undefined, {
    status,
    statusText: String(status),
    data,
    headers,
    config,
  });
}

describe('API error classification', () => {
  it('treats a missing response as an unknown outcome (network), never a job failure', () => {
    expect(toApiProblem(new AxiosError('timeout', 'ECONNABORTED'))).toEqual({ kind: 'network' });
  });

  it('maps the documented error codes', () => {
    expect(toApiProblem(httpError(409, { statusCode: 409, error: 'Conflict', message: 'x', code: 'IDEMPOTENCY_CONFLICT' }))).toEqual({ kind: 'idempotency_conflict' });
    expect(toApiProblem(httpError(409, { statusCode: 409, error: 'Conflict', message: 'x', code: 'STALE_REVISION' }))).toEqual({ kind: 'stale_revision' });
    expect(toApiProblem(httpError(402, { statusCode: 402, error: 'x', message: 'x', code: 'INSUFFICIENT_CREDITS' }))).toEqual({ kind: 'insufficient_credits' });
    expect(toApiProblem(httpError(403, { statusCode: 403, error: 'x', message: 'x', code: 'INSUFFICIENT_CREDITS' }))).toEqual({ kind: 'insufficient_credits' });
    expect(toApiProblem(httpError(409, { statusCode: 409, error: 'x', message: 'x', code: 'ALREADY_COMPLETED' }))).toEqual({ kind: 'already_completed' });
    expect(
      toApiProblem(httpError(422, { statusCode: 422, error: 'x', message: 'bad', code: 'UNSUPPORTED_CAPABILITY', fieldErrors: [{ field: 'size', message: 'unsupported' }] }))
    ).toEqual({ kind: 'invalid', code: 'UNSUPPORTED_CAPABILITY', message: 'bad', fieldErrors: [{ field: 'size', message: 'unsupported' }] });
    expect(toApiProblem(httpError(503, {}))).toEqual({ kind: 'server', status: 503 });
    expect(toApiProblem(httpError(401, {}))).toEqual({ kind: 'unauthorized' });
  });

  it('reads Retry-After seconds and dates, clamped to a sane range', () => {
    expect(toApiProblem(httpError(429, { code: 'RATE_LIMITED' }, { 'retry-after': '3' }))).toEqual({ kind: 'rate_limited', retryAfterMs: 3000 });
    expect(toApiProblem(httpError(429, {}))).toEqual({ kind: 'rate_limited', retryAfterMs: 2000 });
    expect(toApiProblem(httpError(429, {}, { 'retry-after': '99999' }))).toEqual({ kind: 'rate_limited', retryAfterMs: 60000 });
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:03 GMT', Date.parse('Wed, 21 Oct 2026 07:28:00 GMT'))).toBe(3000);
    expect(parseRetryAfter('soon')).toBeNull();
  });

  it('accepts only well-formed socket hints', () => {
    const hint = { schemaVersion: 1, jobId: 'j', stateVersion: 3, status: 'PROCESSING' };
    expect(isGenerationUpdatedEvent(hint)).toBe(true);
    expect(isGenerationUpdatedEvent({ ...hint, status: 'DONE' })).toBe(false);
    expect(isGenerationUpdatedEvent({ ...hint, stateVersion: 'x' })).toBe(false);
    expect(isGenerationUpdatedEvent(null)).toBe(false);
  });
});
