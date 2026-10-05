import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AddressInfo } from 'net';
import * as request from 'supertest';
import { io } from 'socket.io-client';
import {
  anonymous,
  as,
  baseRequest,
  createSession,
  createTestApp,
  createUser,
  dispatcherOf,
  FakeWorker,
  prismaOf,
  queueOf,
  signIn,
} from './support/harness';

describe('operations: metrics and multiple API replicas (V17)', () => {
  let a: INestApplication;
  let b: INestApplication;

  beforeAll(async () => {
    process.env.METRICS_TOKEN = 'integration-metrics-token';
    a = await createTestApp({ redisAdapter: true });
    b = await createTestApp({ redisAdapter: true });
    await a.listen(0);
    await b.listen(0);
  });

  afterAll(async () => {
    await queueOf(a).obliterate({ force: true });
    await Promise.all([a.close(), b.close()]);
  });

  it('exposes bounded-cardinality metrics only to a caller with the metrics token', async () => {
    await anonymous(a).get('/api/metrics').expect(401);
    await anonymous(a).get('/api/metrics').set('Authorization', 'Bearer wrong').expect(401);
    const response = await anonymous(a).get('/api/metrics').set('Authorization', `Bearer ${process.env.METRICS_TOKEN}`).expect(200);
    expect(response.text).toContain('bobby_outbox_unpublished');
    expect(response.text).toContain('bobby_generation_unknown_outcomes_24h');
    expect(response.text).not.toMatch(/user|job_id|jobId/i);
  });

  it('hides the endpoint entirely when no token is configured', async () => {
    const saved = process.env.METRICS_TOKEN;
    delete process.env.METRICS_TOKEN;
    try {
      await anonymous(a).get('/api/metrics').expect(404);
    } finally {
      process.env.METRICS_TOKEN = saved;
    }
  });

  it('publishes every job exactly once when two dispatchers race', async () => {
    await queueOf(a).obliterate({ force: true });
    const owners = await Promise.all(Array.from({ length: 4 }, (_, i) => createUser(`race${i}`)));
    await Promise.all(owners.map((u) => signIn(a, u)));
    const jobs: string[] = [];
    for (const [i, owner] of owners.entries()) {
      const session = await createSession(a, owner);
      const res = await as(a, owner).post('/api/generations').set('Idempotency-Key', randomUUID()).send(baseRequest(session, { prompt: `race ${i}` })).expect(202);
      jobs.push(res.body.id);
    }
    await Promise.all([dispatcherOf(a).tick(), dispatcherOf(b).tick(), dispatcherOf(a).tick(), dispatcherOf(b).tick()]);
    for (const id of jobs) {
      const outbox = await prismaOf(a).generationOutbox.findFirstOrThrow({ where: { jobId: id } });
      expect(outbox.attempts).toBe(1);
      expect(outbox.publishedAt).not.toBeNull();
      expect(await queueOf(a).getJob(id)).toBeDefined();
    }
    const waiting = await queueOf(a).getJobs(['waiting']);
    expect(waiting.filter((job) => jobs.includes(job.id as string))).toHaveLength(jobs.length);
  });

  it('delivers a generation event produced on one replica to a socket connected to the other', async () => {
    const owner = await createUser('fanout');
    await signIn(a, owner);
    const session = await createSession(a, owner);

    const portOf = (app: INestApplication) => (app.getHttpServer().address() as AddressInfo).port;
    const received: Array<{ status: string }> = [];
    const socket = io(`http://127.0.0.1:${portOf(b)}`, { auth: { token: owner.token }, transports: ['websocket'], forceNew: true, reconnection: false });
    await new Promise<void>((resolve) => socket.once('authenticated', () => resolve()));
    socket.on('generation.updated', (event: { status: string }) => received.push(event));

    // Submit through replica A, run the worker protocol through replica A, listen on replica B.
    const accepted = await as(a, owner).post('/api/generations').set('Idempotency-Key', randomUUID()).send(baseRequest(session)).expect(202);
    await dispatcherOf(a).tick();
    const worker = new FakeWorker(a);
    expect((await worker.claim(accepted.body.id)).action).toBe('run');
    await worker.event(accepted.body.id, 'completed', { outputs: await worker.outputs(accepted.body.id), durationMs: 1 }).expect(200);

    await new Promise((r) => setTimeout(r, 500));
    socket.close();
    expect(received.map((event) => event.status)).toContain('COMPLETED');
    // And the durable snapshot read from the other replica agrees.
    const fromB = await request(b.getHttpServer()).get(`/api/generations/${accepted.body.id}`).set('Authorization', `Bearer ${owner.token}`).expect(200);
    expect(fromB.body.status).toBe('COMPLETED');
  });
});
