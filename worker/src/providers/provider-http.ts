import { ProviderError, type ProviderContext, type ProviderErrorCode, type ProviderId, type ProviderLogger } from './provider.port';

export const DEFAULT_MAX_RESPONSE_BYTES = 32 * 1024 * 1024;
/** Error bodies are only inspected for a short code, so they are read with a small cap. */
const MAX_ERROR_BODY_BYTES = 64 * 1024;
const MAX_RETRY_AFTER_MS = 60 * 60 * 1000;

export interface ProviderHttpRequest {
  url: string;
  headers: Record<string, string>;
  body: string | FormData;
}

export interface ProviderHttpResponse {
  status: number;
  headers: Headers;
  body: Buffer;
}

export interface TransportOptions {
  provider: ProviderId;
  logger: ProviderLogger;
  maxResponseBytes?: number;
}

// Socket-level failures that happen before any request bytes can have been delivered.
const PRE_SEND_ERROR_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH', 'UND_ERR_CONNECT_TIMEOUT']);

function causeCode(error: unknown): string | undefined {
  // Not `instanceof Error`: errors raised inside Node core can come from another realm (for example under Jest).
  let current: unknown = error;
  for (let depth = 0; depth < 4 && typeof current === 'object' && current !== null; depth++) {
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string') return code;
    current = cause;
  }
  return undefined;
}

/** Parses Retry-After style values (delta seconds or HTTP date) into milliseconds. */
export function parseRetryAfterMs(headers: Headers, now: number = Date.now()): number | undefined {
  const precise = headers.get('retry-after-ms');
  if (precise && /^\d+(\.\d+)?$/.test(precise.trim())) return Math.min(Math.round(Number(precise)), MAX_RETRY_AFTER_MS);
  const raw = headers.get('retry-after')?.trim();
  if (!raw) return undefined;
  if (/^\d+(\.\d+)?$/.test(raw)) return Math.min(Math.round(Number(raw) * 1000), MAX_RETRY_AFTER_MS);
  const date = Date.parse(raw);
  return Number.isNaN(date) ? undefined : Math.min(Math.max(0, date - now), MAX_RETRY_AFTER_MS);
}

export interface FailureHints {
  quotaExhausted?: boolean;
  noImage?: boolean;
  providerErrorCode?: string;
  retryAfterMs?: number;
}

/**
 * Maps an HTTP failure to the normalized policy of the generation contracts (section 7).
 * 500 may hide a paid result, 502/503 refuse before processing, 504/408 are timeouts after dispatch.
 */
export function classifyHttpFailure(status: number, hints: FailureHints = {}): ProviderError {
  const base = { httpStatus: status, providerErrorCode: hints.providerErrorCode };
  const fail = (code: ProviderErrorCode, message: string, extra: { outcomeUnknown?: boolean; retryAfterMs?: number } = {}) =>
    new ProviderError(code, message, { ...base, ...extra });

  if (hints.noImage) return fail('PROVIDER_NO_IMAGE', 'The provider declined to produce an image.');
  if (hints.quotaExhausted) return fail('PROVIDER_QUOTA_EXHAUSTED', 'The provider account has no remaining quota or credit.');
  if (status === 401 || status === 403) return fail('PROVIDER_AUTH', 'The provider rejected the configured credentials.');
  if (status === 404) return fail('UNSUPPORTED_CAPABILITY', 'The provider does not offer the configured model or operation.');
  if (status === 429) return fail('PROVIDER_RATE_LIMITED', 'The provider rate limit was reached.', { retryAfterMs: hints.retryAfterMs });
  if (status === 408 || status === 504) return fail('PROVIDER_OUTCOME_UNKNOWN', 'The provider timed out after receiving the request.', { outcomeUnknown: true });
  if (status === 502 || status === 503) return fail('PROVIDER_UNAVAILABLE', 'The provider is temporarily unavailable.', { retryAfterMs: hints.retryAfterMs });
  if (status >= 500) return fail('PROVIDER_UNAVAILABLE', 'The provider reported an internal error.', { outcomeUnknown: true, retryAfterMs: hints.retryAfterMs });
  if (status >= 400) return fail('INVALID_INPUT', 'The provider rejected the request as invalid.');
  return fail('PROVIDER_UNAVAILABLE', 'The provider returned an unexpected status.', { outcomeUnknown: true });
}

/** Strips a provider-supplied code/type down to a short safe token for diagnostics. */
export function safeToken(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(value) ? value : undefined;
}

export function parseJson(body: Buffer): unknown {
  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    return undefined;
  }
}

async function readBounded(response: Response, limit: number, truncate: boolean): Promise<Buffer | 'too_large'> {
  const declared = Number(response.headers.get('content-length'));
  if (!truncate && Number.isFinite(declared) && declared > limit) {
    await response.body?.cancel();
    return 'too_large';
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      if (truncate) break;
      return 'too_large';
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/**
 * Sends exactly one HTTP request. There is no retry here or anywhere in the adapters; callers own
 * retries. Enforces the absolute deadline and the caller's abort signal, never follows redirects
 * (a redirect must not silently move traffic to another host) and bounds the response size.
 */
export async function sendProviderRequest(request: ProviderHttpRequest, ctx: ProviderContext, options: TransportOptions): Promise<ProviderHttpResponse> {
  const { provider, logger } = options;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const deadline = Date.parse(ctx.deadlineAt);
  if (Number.isNaN(deadline)) throw new ProviderError('INVALID_INPUT', 'deadlineAt must be an ISO-8601 timestamp.');
  if (ctx.signal.aborted) throw new ProviderError('CANCELLED', 'The generation was cancelled before the provider request was sent.');
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) throw new ProviderError('PROVIDER_UNAVAILABLE', 'The deadline elapsed before the provider request was sent.');

  const controller = new AbortController();
  let reason: 'cancelled' | 'deadline' | null = null;
  const timer = setTimeout(() => {
    reason = 'deadline';
    controller.abort();
  }, remainingMs);
  const onCancel = () => {
    reason ??= 'cancelled';
    controller.abort();
  };
  ctx.signal.addEventListener('abort', onCancel, { once: true });

  const startedAt = Date.now();
  const finish = (status: string): void => {
    logger.log(`provider=${provider} correlationId=${ctx.correlationId} status=${status} durationMs=${Date.now() - startedAt}`);
  };
  // After fetch() starts the request may have been delivered: abort/timeout outcomes are unknown.
  const abortError = (): ProviderError =>
    reason === 'deadline'
      ? new ProviderError('PROVIDER_OUTCOME_UNKNOWN', 'The deadline elapsed while waiting for the provider.', { outcomeUnknown: true })
      : new ProviderError('CANCELLED', 'The generation was cancelled while the provider request was in flight.', { outcomeUnknown: true });

  try {
    let response: Response;
    try {
      response = await fetch(request.url, { method: 'POST', headers: request.headers, body: request.body, signal: controller.signal, redirect: 'error' });
    } catch (error) {
      if (controller.signal.aborted) throw abortError();
      if ((error as { name?: unknown }).name === 'TypeError' && (error as { message?: unknown }).message === 'Invalid URL') {
        throw new ProviderError('PROVIDER_UNAVAILABLE', 'The provider base URL is invalid.');
      }
      const code = causeCode(error);
      if (code && PRE_SEND_ERROR_CODES.has(code)) {
        throw new ProviderError('PROVIDER_UNAVAILABLE', `The provider could not be reached (${code}).`, { providerErrorCode: code });
      }
      throw new ProviderError('PROVIDER_OUTCOME_UNKNOWN', 'The connection to the provider failed after the request was sent.', { outcomeUnknown: true, providerErrorCode: code });
    }

    const ok = response.status >= 200 && response.status < 300;
    let body: Buffer | 'too_large';
    try {
      body = await readBounded(response, ok ? maxResponseBytes : MAX_ERROR_BODY_BYTES, !ok);
    } catch (error) {
      if (controller.signal.aborted) throw abortError();
      if (!ok) body = Buffer.alloc(0);
      else throw new ProviderError('PROVIDER_OUTCOME_UNKNOWN', 'The provider connection broke while the response was being read.', { outcomeUnknown: true, httpStatus: response.status, providerErrorCode: causeCode(error) });
    }
    if (body === 'too_large') {
      throw new ProviderError('PROVIDER_MALFORMED_OUTPUT', 'The provider response exceeded the size limit.', { httpStatus: response.status });
    }
    finish(String(response.status));
    return { status: response.status, headers: response.headers, body };
  } catch (error) {
    if (error instanceof ProviderError) {
      logger.warn(`provider=${provider} correlationId=${ctx.correlationId} status=${error.httpStatus ?? 'none'} code=${error.code} durationMs=${Date.now() - startedAt}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    ctx.signal.removeEventListener('abort', onCancel);
  }
}
