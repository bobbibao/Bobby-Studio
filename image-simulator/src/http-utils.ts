import type { IncomingMessage, ServerResponse } from 'node:http';

export interface HttpReply {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export type BodyResult = { kind: 'ok'; data: Buffer } | { kind: 'too_large' };

/**
 * Buffers the request body up to `limit` bytes. Oversized bodies are drained without being stored
 * (so the client can read the 413) until a hard cap of twice the limit, after which the socket is cut.
 */
export function readBody(req: IncomingMessage, limit: number): Promise<BodyResult> {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = Number.isFinite(declared) && declared > limit;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) tooLarge = true;
      if (size > limit * 2) {
        req.destroy();
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    req.on('end', () => resolve(tooLarge ? { kind: 'too_large' } : { kind: 'ok', data: Buffer.concat(chunks) }));
    req.on('error', reject);
    req.on('close', () => {
      if (!req.complete) reject(new Error('client closed the connection before the request body completed'));
    });
  });
}

export function sendReply(res: ServerResponse, reply: HttpReply, extraHeaders: Record<string, string> = {}): void {
  if (res.destroyed || res.writableEnded) return;
  const payload = typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body);
  res.writeHead(reply.status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    'x-bobby-simulated': 'true',
    ...extraHeaders,
    ...reply.headers,
  });
  res.end(payload);
}

/** Resolves after `ms`; rejects immediately when the signal aborts so no timer outlives the client. */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('aborted'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
