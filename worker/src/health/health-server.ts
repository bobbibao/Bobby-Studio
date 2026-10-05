import { createServer, Server } from 'http';
import Redis from 'ioredis';
import { WorkerRuntimeConfig } from '../config/worker-config';

const CHECK_TIMEOUT_MS = 2000;

async function withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), CHECK_TIMEOUT_MS);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Minimal HTTP surface for liveness and readiness. Readiness verifies Redis and the API's
 * readiness endpoint; it never calls the image provider, so it cannot incur provider cost.
 */
export function startHealthServer(config: WorkerRuntimeConfig, isShuttingDown: () => boolean): Server {
  const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    lazyConnect: true,
    connectTimeout: CHECK_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  redis.on('error', () => undefined);

  const readiness = async () => {
    const checks: Record<string, 'ok' | 'failed'> = {};
    await Promise.all([
      withTimeout(
        (async () => {
          if (redis.status === 'wait' || redis.status === 'end') await redis.connect();
          if ((await redis.ping()) !== 'PONG') throw new Error('unexpected PING reply');
        })(),
        'redis',
      ).then(
        () => (checks.redis = 'ok'),
        () => (checks.redis = 'failed'),
      ),
      withTimeout(fetch(`${config.apiInternalUrl}/health/ready`).then((r) => r.ok || Promise.reject(new Error(`HTTP ${r.status}`))), 'api').then(
        () => (checks.api = 'ok'),
        () => (checks.api = 'failed'),
      ),
    ]);
    const ready = !isShuttingDown() && Object.values(checks).every((status) => status === 'ok');
    return { ready, body: { status: ready ? 'ready' : 'unavailable', checks } };
  };

  const server = createServer((request, response) => {
    const send = (status: number, body: unknown) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(body));
    };
    if (request.method === 'GET' && request.url === '/health/live') {
      send(200, { status: 'ok' });
      return;
    }
    if (request.method === 'GET' && request.url === '/health/ready') {
      readiness().then(({ ready, body }) => send(ready ? 200 : 503, body), () => send(503, { status: 'unavailable' }));
      return;
    }
    send(404, { error: 'not found' });
  });
  server.on('close', () => redis.disconnect());
  server.listen(config.healthPort, config.healthHost);
  return server;
}
