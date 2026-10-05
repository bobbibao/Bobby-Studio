import { isAxiosError } from 'axios';
import { API_ERROR_CODES, type ApiErrorBody } from '../contracts';
import type { ApiProblem, FieldError } from '../scheduler/types';

const DEFAULT_RETRY_AFTER_MS = 2000;
const MAX_RETRY_AFTER_MS = 60000;

/** Retry-After is either delta-seconds or an HTTP date. Returns milliseconds, or null when unusable. */
export function parseRetryAfter(value: unknown, nowMs: number = Date.now()): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }
  const text = String(value).trim();
  if (text === '') {
    return null;
  }
  if (/^\d+(\.\d+)?$/.test(text)) {
    return Math.round(Number(text) * 1000);
  }
  const date = Date.parse(text);
  return Number.isNaN(date) ? null : Math.max(0, date - nowMs);
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const code: unknown = Reflect.get(value, 'code');
  return typeof code === 'string' && API_ERROR_CODES.some((known) => known === code);
}

function messageOf(data: unknown): string {
  if (typeof data === 'object' && data !== null) {
    const message: unknown = Reflect.get(data, 'message');
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message)) {
      return message.filter((item): item is string => typeof item === 'string').join('; ');
    }
  }
  return '';
}

function fieldErrorsOf(data: unknown): FieldError[] {
  if (typeof data !== 'object' || data === null) {
    return [];
  }
  const raw: unknown = Reflect.get(data, 'fieldErrors');
  if (!Array.isArray(raw)) {
    return [];
  }
  const result: FieldError[] = [];
  for (const item of raw) {
    if (typeof item === 'object' && item !== null) {
      const field: unknown = Reflect.get(item, 'field');
      const message: unknown = Reflect.get(item, 'message');
      if (typeof field === 'string' && typeof message === 'string') {
        result.push({ field, message });
      }
    }
  }
  return result;
}

function readHeader(headers: unknown, name: string): unknown {
  if (typeof headers !== 'object' || headers === null) {
    return undefined;
  }
  const direct: unknown = Reflect.get(headers, name);
  if (direct !== undefined) {
    return direct;
  }
  const getter: unknown = Reflect.get(headers, 'get');
  return typeof getter === 'function' ? getter.call(headers, name) : undefined;
}

/** Classifies a failed request. The scheduler only sees these categories, never axios types. */
export function toApiProblem(error: unknown): ApiProblem {
  if (!isAxiosError(error)) {
    return { kind: 'unknown', status: null, message: error instanceof Error ? error.message : 'Unknown error' };
  }
  const response = error.response;
  if (!response) {
    return { kind: 'network' }; // timeout, DNS, offline, CORS: the outcome is unknown
  }
  const status = response.status;
  const data: unknown = response.data;
  const code = isApiErrorBody(data) ? data.code : null;

  if (status === 429 || code === 'RATE_LIMITED') {
    const retryAfter = parseRetryAfter(readHeader(response.headers, 'retry-after'));
    return {
      kind: 'rate_limited',
      retryAfterMs: Math.min(MAX_RETRY_AFTER_MS, Math.max(1000, retryAfter ?? DEFAULT_RETRY_AFTER_MS)),
    };
  }
  switch (code) {
    case 'IDEMPOTENCY_CONFLICT':
      return { kind: 'idempotency_conflict' };
    case 'STALE_REVISION':
      return { kind: 'stale_revision' };
    case 'INSUFFICIENT_CREDITS':
      return { kind: 'insufficient_credits' };
    case 'ALREADY_COMPLETED':
      return { kind: 'already_completed' };
    case 'NOT_FOUND':
      return { kind: 'not_found' };
    case 'UNSUPPORTED_CAPABILITY':
    case 'INVALID_INPUT':
      return { kind: 'invalid', code, message: messageOf(data), fieldErrors: fieldErrorsOf(data) };
    case 'UNAVAILABLE':
      return { kind: 'server', status };
    default:
      break;
  }
  if (status === 401) {
    return { kind: 'unauthorized' };
  }
  if (status === 402) {
    return { kind: 'insufficient_credits' };
  }
  if (status === 404) {
    return { kind: 'not_found' };
  }
  if (status === 408) {
    return { kind: 'network' };
  }
  if (status === 400 || status === 422) {
    return { kind: 'invalid', code: 'INVALID_INPUT', message: messageOf(data), fieldErrors: fieldErrorsOf(data) };
  }
  if (status >= 500) {
    return { kind: 'server', status };
  }
  return { kind: 'unknown', status, message: messageOf(data) || error.message };
}
