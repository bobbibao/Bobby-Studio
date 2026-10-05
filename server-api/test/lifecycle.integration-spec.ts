import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AddressInfo } from 'net';
import { io } from 'socket.io-client';
import {
  as,
  baseRequest,
  createSession,
  createTestApp,
  createUser,
  dispatcherOf,
  FakeWorker,
  makePng,
  prismaOf,
  queueOf,
  reconcilerOf,
  signIn,
  TestUser,
} from './support/harness';

describe('generation lifecycle', () => {
  let app: INestApplication;
  let user: TestUser;
  let sessionId: string;

  const submit = (u: TestUser, body: object, key = randomUUID()) => as(app, u).post('/api/generations').set('Idempotency-Key', key).send(body);
  const snapshot = async (id: string, u = user) => (await as(app, u).get(`/api/generations/${id}`).expect(200)).body;
  const balance = async (u = user) => (await as(app, u).get('/api/credits/balance').expect(200)).body as { available: number; reserved: number };
  const dispatch = () => dispatcherOf(app).tick();
  const rowOf = (id: string) => prismaOf(app).imageJob.findUniqueOrThrow({ where: { id } });

  /** Submits, dispatches, claims and returns a worker holding the attempt. */
  async function startRunning(u = user, session = sessionId, overrides: Record<string, unknown> = {}) {
    const accepted = await submit(u, baseRequest(session, overrides)).expect(202);
    await dispatch();
    const worker = new FakeWorker(app);
    const claim = await worker.claim(accepted.body.id);
    expect(claim.action).toBe('run');
    return { id: accepted.body.id as string, worker };
  }

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    // A fresh user per test keeps the per-user backlog bound and balances independent.
    user = await createUser('gen');
    await signIn(app, user);
    sessionId = await createSession(app, user);
    await queueOf(app).obliterate({ force: true });
  });

  afterAll(async () => {
    await queueOf(app).obliterate({ force: true });
    await app.close();
  });

  describe('admission and idempotency (V07)', () => {
    it('accepts a valid request durably and publishes it only through the outbox', async () => {
      const response = await submit(user, baseRequest(sessionId)).expect(202);
      expect(response.body).toMatchObject({ status: 'PENDING', stateVersion: 1, isSimulated: true, clientRevision: 1 });
      expect(await queueOf(app).getJob(response.body.id)).toBeUndefined();
      expect(await prismaOf(app).generationOutbox.count({ where: { jobId: response.body.id, publishedAt: null } })).toBe(1);

      expect(await dispatch()).toBe(1);
      expect((await queueOf(app).getJob(response.body.id))?.data).toMatchObject({ schemaVersion: 1, jobId: response.body.id, modelId: 'simulated-openai-image' });
      expect((await snapshot(response.body.id)).status).toBe('QUEUED');
    });

    it('creates one job, one reservation and one outbox row for concurrent identical keys', async () => {
      const key = randomUUID();
      const body = baseRequest(sessionId);
      const results = await Promise.all(Array.from({ length: 8 }, () => submit(user, body, key)));
      expect(new Set(results.map((r) => r.status))).toEqual(new Set([202]));
      const ids = new Set(results.map((r) => r.body.id));
      expect(ids.size).toBe(1);
      const [id] = [...ids];
      expect(await prismaOf(app).creditReservation.count({ where: { jobId: id as string } })).toBe(1);
      expect(await prismaOf(app).generationOutbox.count({ where: { jobId: id as string } })).toBe(1);
    });

    it('rejects a reused key with different input and recovers the job on same-key replay', async () => {
      const key = randomUUID();
      const first = await submit(user, baseRequest(sessionId), key).expect(202);
      await submit(user, baseRequest(sessionId, { prompt: 'something else' }), key).expect(409).expect((r) => expect(r.body.code).toBe('IDEMPOTENCY_CONFLICT'));
      const replay = await submit(user, baseRequest(sessionId), key).expect(202);
      expect(replay.body.id).toBe(first.body.id);
    });

    it('rejects client-supplied identity, prices and unknown fields instead of ignoring them', async () => {
      for (const extra of [{ userId: 'x' }, { creditCost: 0 }, { endpoint: 'http://x' }]) {
        await submit(user, { ...baseRequest(sessionId), ...extra }).expect(400);
      }
    });

    it('reports unsupported settings with field errors and never silently drops them', async () => {
      const bad = await submit(user, baseRequest(sessionId, { size: { width: 512, height: 512 }, mode: 'sketch_to_image' })).expect(422);
      expect(bad.body.code).toBe('UNSUPPORTED_CAPABILITY');
      expect(bad.body.fieldErrors.map((e: { field: string }) => e.field).sort()).toEqual(['inputAssetId', 'size']);
      await submit(user, baseRequest(sessionId, { modelId: 'no-such-model' })).expect(422);
      await submit(user, baseRequest(sessionId, { mode: 'text_to_image', inputAssetId: randomUUID() })).expect(422);
    });

    it("does not accept someone else's input image or session", async () => {
      const other = await createUser('other');
      await signIn(app, other);
      const upload = await as(app, other).post('/api/uploads').attach('file', await makePng({ r: 1, g: 2, b: 3 }), { filename: 'a.png', contentType: 'image/png' }).expect(201);
      await submit(user, baseRequest(sessionId, { mode: 'image_to_image', inputAssetId: upload.body.assetId })).expect(422);
      const otherSession = await createSession(app, other);
      await submit(user, baseRequest(otherSession)).expect(404);
    });
  });

  describe('revisions and coalescing (V14 server side)', () => {
    it('rejects an older revision and a reused revision with different content', async () => {
      await submit(user, baseRequest(sessionId, { clientRevision: 5 })).expect(202);
      await submit(user, baseRequest(sessionId, { clientRevision: 4 })).expect(409).expect((r) => expect(r.body.code).toBe('STALE_REVISION'));
      await submit(user, baseRequest(sessionId, { clientRevision: 5, prompt: 'different' })).expect(409);
    });

    it('collapses the same revision and content sent with a new key to the same job', async () => {
      const a = await submit(user, baseRequest(sessionId, { clientRevision: 3 })).expect(202);
      const b = await submit(user, baseRequest(sessionId, { clientRevision: 3 })).expect(202);
      expect(b.body.id).toBe(a.body.id);
    });

    it('keeps one latest pending preview: a newer input supersedes the older pending one and releases its credits', async () => {
      const before = await balance();
      const first = await submit(user, baseRequest(sessionId, { intent: 'preview', clientRevision: 1 })).expect(202);
      const second = await submit(user, baseRequest(sessionId, { intent: 'preview', clientRevision: 2, prompt: 'newer' })).expect(202);
      const old = await snapshot(first.body.id);
      expect(old).toMatchObject({ status: 'CANCELLED', error: { code: 'SUPERSEDED' } });
      expect((await snapshot(second.body.id)).status).toBe('PENDING');
      expect((await balance()).available).toBe(before.available - 1);
      expect(await prismaOf(app).creditReservation.findUnique({ where: { jobId: first.body.id } })).toMatchObject({ status: 'RELEASED' });
    });

    it('never supersedes an explicit final', async () => {
      const final = await submit(user, baseRequest(sessionId, { intent: 'final', clientRevision: 1 })).expect(202);
      await submit(user, baseRequest(sessionId, { intent: 'preview', clientRevision: 2, prompt: 'auto' })).expect(202);
      expect((await snapshot(final.body.id)).status).toBe('PENDING');
    });

    it('enforces the minimum preview interval with Retry-After', async () => {
      process.env.GENERATION_MIN_PREVIEW_INTERVAL_MS = '2000';
      try {
        await submit(user, baseRequest(sessionId, { intent: 'preview', clientRevision: 1 })).expect(202);
        const limited = await submit(user, baseRequest(sessionId, { intent: 'preview', clientRevision: 2, prompt: 'again' })).expect(429);
        expect(limited.body.code).toBe('RATE_LIMITED');
        expect(limited.headers['retry-after']).toBe('2');
      } finally {
        process.env.GENERATION_MIN_PREVIEW_INTERVAL_MS = '0';
      }
    });

    it('executes one job per session at a time and starts the next only after capacity is released', async () => {
      const { id: running, worker } = await startRunning();
      const next = await submit(user, baseRequest(sessionId, { clientRevision: 2, prompt: 'next' })).expect(202);
      await dispatch();
      expect((await snapshot(next.body.id)).status).toBe('PENDING');
      expect(await queueOf(app).getJob(next.body.id)).toBeUndefined();

      await worker.event(running, 'completed', { outputs: await worker.outputs(running), durationMs: 5 }).expect(200);
      await dispatch();
      expect((await snapshot(next.body.id)).status).toBe('QUEUED');
    });
  });

  describe('finalization, fencing and credits (V09, V13)', () => {
    it('completes once: one result, one capture, one usage row, even for duplicate and stale callbacks', async () => {
      const before = await balance();
      const { id, worker } = await startRunning();
      expect((await balance()).available).toBe(before.available - 1);

      await worker.event(id, 'started', {}).expect(200);
      const outputs = await worker.outputs(id);
      const done = await worker.event(id, 'completed', { outputs, durationMs: 12 }).expect(200);
      expect(done.body).toEqual({ acknowledged: true, applied: true });

      const sameAgain = await worker.event(id, 'completed', { outputs, durationMs: 12 }, { sequence: 2 }).expect(200);
      expect(sameAgain.body.applied).toBe(false);
      const stale = await worker.event(id, 'completed', { outputs, durationMs: 12 }, { runToken: 'a-token-that-is-wrong-0123456789' }).expect(200);
      expect(stale.body.applied).toBe(false);

      const snap = await snapshot(id);
      expect(snap).toMatchObject({ status: 'COMPLETED', stateVersion: expect.any(Number), result: { assets: [expect.objectContaining({ width: 32, height: 32, saved: false })] } });
      expect(await prismaOf(app).asset.count({ where: { jobId: id, kind: 'output' } })).toBe(1);
      const after = await balance();
      expect(after).toEqual({ available: before.available - 1, reserved: 0 });
      expect(await prismaOf(app).usage.count({ where: { resourceId: id } })).toBe(1);
      expect(await prismaOf(app).creditReservation.findUnique({ where: { jobId: id } })).toMatchObject({ status: 'CAPTURED' });
    });

    it('refuses events from a superseded attempt and stale sequences without effects', async () => {
      const { id, worker } = await startRunning();
      const attempt1 = { attemptId: worker.attemptId, runToken: worker.runToken };
      const second = new FakeWorker(app);
      expect((await second.claim(id)).action).toBe('run');

      const late = await worker.event(id, 'progress', { stage: 'storing' }, attempt1).expect(200);
      expect(late.body.applied).toBe(false);
      const current = await second.event(id, 'progress', { stage: 'storing' }).expect(200);
      expect(current.body.applied).toBe(true);
      const replaySeq = await second.event(id, 'progress', { stage: 'finalizing' }, { sequence: 1 }).expect(200);
      expect(replaySeq.body.applied).toBe(false);
      expect((await rowOf(id)).stage).toBe('storing');
    });

    it('never lets concurrent submissions overspend the balance', async () => {
      const poor = await createUser('poor');
      await signIn(app, poor);
      await prismaOf(app).user.update({ where: { id: poor.uid }, data: { freeCredit: 3, usedFreeCredit: 0, paidCredit: 0 } });
      const sessions = await Promise.all(Array.from({ length: 6 }, () => createSession(app, poor)));
      const results = await Promise.all(sessions.map((s, i) => submit(poor, baseRequest(s, { prompt: `p${i}` }))));
      const accepted = results.filter((r) => r.status === 202).length;
      const refused = results.filter((r) => r.status === 402).length;
      expect(accepted).toBe(3);
      expect(refused).toBe(3);
      const row = await prismaOf(app).user.findUniqueOrThrow({ where: { id: poor.uid } });
      expect(row.reservedCredit).toBe(3);
      expect((await balance(poor)).available).toBe(0);
    });
  });

  describe('cancellation (V10)', () => {
    it('cancels before dispatch, releases credits and is idempotent', async () => {
      const before = await balance();
      const accepted = await submit(user, baseRequest(sessionId)).expect(202);
      const first = await as(app, user).post(`/api/generations/${accepted.body.id}/cancel`).expect(200);
      expect(first.body).toMatchObject({ status: 'CANCELLED', cancellationRequested: true });
      await as(app, user).post(`/api/generations/${accepted.body.id}/cancel`).expect(200);
      expect(await balance()).toEqual(before);
      await dispatch();
      expect(await queueOf(app).getJob(accepted.body.id)).toBeUndefined();
      expect((await snapshot(accepted.body.id)).status).toBe('CANCELLED');
    });

    it('keeps execution capacity until the worker confirms, and a late result cannot resurrect or charge', async () => {
      const before = await balance();
      const { id, worker } = await startRunning();
      await as(app, user).post(`/api/generations/${id}/cancel`).expect(200);
      expect((await rowOf(id)).executionFinishedAt).toBeNull();
      expect(await balance()).toEqual(before);

      const next = await submit(user, baseRequest(sessionId, { clientRevision: 2, prompt: 'after cancel' })).expect(202);
      await dispatch();
      expect((await snapshot(next.body.id)).status).toBe('PENDING');

      const late = await worker.event(id, 'completed', { outputs: await worker.outputs(id), durationMs: 3 }).expect(200);
      expect(late.body.applied).toBe(false);
      expect((await snapshot(id)).status).toBe('CANCELLED');
      expect((await rowOf(id)).executionFinishedAt).not.toBeNull();
      expect(await prismaOf(app).asset.count({ where: { jobId: id } })).toBe(0);
      expect(await prismaOf(app).creditReservation.findUnique({ where: { jobId: id } })).toMatchObject({ status: 'RELEASED' });

      await dispatch();
      expect((await snapshot(next.body.id)).status).toBe('QUEUED');
    });

    it('answers 409 when the generation already completed', async () => {
      const { id, worker } = await startRunning();
      await worker.event(id, 'completed', { outputs: await worker.outputs(id), durationMs: 1 }).expect(200);
      await as(app, user).post(`/api/generations/${id}/cancel`).expect(409).expect((r) => expect(r.body.code).toBe('ALREADY_COMPLETED'));
    });

    it('resolves a cancel/complete race to exactly one financial effect, in either order', async () => {
      for (let round = 0; round < 12; round += 1) {
        const session = await createSession(app, user);
        const before = await balance();
        const { id, worker } = await startRunning(user, session);
        const outputs = await worker.outputs(id);
        await Promise.all([
          as(app, user).post(`/api/generations/${id}/cancel`),
          worker.event(id, 'completed', { outputs, durationMs: 1 }),
        ]);
        const job = await rowOf(id);
        const reservation = await prismaOf(app).creditReservation.findUniqueOrThrow({ where: { jobId: id } });
        const after = await balance();
        if (job.status === 'COMPLETED') {
          expect(reservation.status).toBe('CAPTURED');
          expect(after.available).toBe(before.available - 1);
        } else {
          expect(job.status).toBe('CANCELLED');
          expect(reservation.status).toBe('RELEASED');
          expect(after.available).toBe(before.available);
        }
        expect(after.reserved).toBe(0);
      }
    });
  });

  describe('recovery (V08, V12, V18)', () => {
    it('republishes after a crash between enqueue bookkeeping steps without duplicating the queue entry', async () => {
      const accepted = await submit(user, baseRequest(sessionId)).expect(202);
      await dispatch();
      // Simulate: queue entry exists but the published marker was never written and the lease expired.
      await prismaOf(app).generationOutbox.updateMany({ where: { jobId: accepted.body.id }, data: { publishedAt: null, leaseUntil: new Date(Date.now() - 1000) } });
      await dispatch();
      const waiting = await queueOf(app).getJobs(['waiting']);
      expect(waiting.filter((job) => job.id === accepted.body.id)).toHaveLength(1);
    });

    it('survives a lost queue: a QUEUED job whose entry vanished is republished from the outbox', async () => {
      const accepted = await submit(user, baseRequest(sessionId)).expect(202);
      await dispatch();
      await queueOf(app).obliterate({ force: true });
      await prismaOf(app).generationOutbox.updateMany({ where: { jobId: accepted.body.id }, data: { publishedAt: null, leaseUntil: new Date(Date.now() - 1000) } });
      await dispatch();
      expect(await queueOf(app).getJob(accepted.body.id)).toBeDefined();
    });

    it('reuses a stored result after a worker crash and never repeats inference', async () => {
      const { id, worker } = await startRunning();
      await worker.event(id, 'started', {}).expect(200);
      const outputs = await worker.outputs(id);
      await worker.event(id, 'checkpoint', { outputs }).expect(200);

      const replacement = new FakeWorker(app);
      const claim = await replacement.claim(id);
      expect(claim).toMatchObject({ action: 'run', outcomeUnknown: false, checkpoint: { outputs } });
      await replacement.event(id, 'completed', { outputs, durationMs: 1 }).expect(200);
      expect((await snapshot(id)).status).toBe('COMPLETED');
    });

    it('treats a started-but-unreported inference as an unknown paid outcome and refuses blind repetition', async () => {
      const before = await balance();
      const { id, worker } = await startRunning();
      await worker.event(id, 'started', {}).expect(200);

      const replacement = new FakeWorker(app);
      const claim = await replacement.claim(id);
      expect(claim).toMatchObject({ action: 'run', outcomeUnknown: true, checkpoint: null });
      await replacement.event(id, 'failed', { errorCode: 'PROVIDER_OUTCOME_UNKNOWN', message: 'unknown', retryable: false, outcomeUnknown: true }).expect(200);
      expect(await snapshot(id)).toMatchObject({ status: 'FAILED', error: { code: 'PROVIDER_OUTCOME_UNKNOWN' } });
      expect(await balance()).toEqual(before);
    });

    it('keeps a job alive after a safe retryable failure and allows the next attempt', async () => {
      const { id, worker } = await startRunning();
      await worker.event(id, 'failed', { errorCode: 'PROVIDER_UNAVAILABLE', message: 'x', retryable: true, outcomeUnknown: false }).expect(200);
      expect((await snapshot(id)).status).toBe('PROCESSING');
      const retry = new FakeWorker(app);
      expect(await retry.claim(id)).toMatchObject({ action: 'run', outcomeUnknown: false });
    });

    it('reconciler fails a silent claimed job past its deadline, releases credits and frees capacity', async () => {
      const before = await balance();
      const { id, worker } = await startRunning();
      await worker.event(id, 'started', {}).expect(200);
      await prismaOf(app).imageJob.update({ where: { id }, data: { deadlineAt: new Date(Date.now() - 120_000) } });
      await prismaOf(app).$executeRaw`UPDATE "ImageJob" SET "updatedAt" = now() - interval '5 minutes' WHERE id = ${id}`;

      const result = await reconcilerOf(app).run();
      expect(result.failed).toBeGreaterThanOrEqual(1);
      expect(await snapshot(id)).toMatchObject({ status: 'FAILED', error: { code: 'PROVIDER_OUTCOME_UNKNOWN' } });
      expect((await rowOf(id)).executionFinishedAt).not.toBeNull();
      expect(await balance()).toEqual(before);
    });

    it('terminal states are absorbing even for direct database writers', async () => {
      const { id, worker } = await startRunning();
      await worker.event(id, 'completed', { outputs: await worker.outputs(id), durationMs: 1 }).expect(200);
      await expect(prismaOf(app).$executeRaw`UPDATE "ImageJob" SET status = 'QUEUED' WHERE id = ${id}`).rejects.toThrow(/terminal/);
    });
  });

  describe('retry, save and history', () => {
    it('retries a failed job as a new intent with its own key and revalidated balance', async () => {
      const { id, worker } = await startRunning();
      await worker.event(id, 'failed', { errorCode: 'PROVIDER_NO_IMAGE', message: 'x', retryable: false, outcomeUnknown: false }).expect(200);
      await as(app, user).post(`/api/generations/${id}/retry`).expect(400);
      const retried = await as(app, user).post(`/api/generations/${id}/retry`).set('Idempotency-Key', randomUUID()).expect(202);
      expect(retried.body.id).not.toBe(id);
      expect((await snapshot(retried.body.id)).retryOfJobId).toBe(id);
    });

    it('refuses to retry a generation whose input has moved on', async () => {
      const { id, worker } = await startRunning();
      await worker.event(id, 'failed', { errorCode: 'PROVIDER_NO_IMAGE', message: 'x', retryable: false, outcomeUnknown: false }).expect(200);
      await submit(user, baseRequest(sessionId, { clientRevision: 2, prompt: 'moved on' })).expect(202);
      await as(app, user).post(`/api/generations/${id}/retry`).set('Idempotency-Key', randomUUID()).expect(409);
    });

    it('saves a completed preview without inference, idempotently, into the library', async () => {
      const { id, worker } = await startRunning();
      await expect(as(app, user).post(`/api/generations/${id}/save`)).resolves.toMatchObject({ status: 409 });
      await worker.event(id, 'completed', { outputs: await worker.outputs(id), durationMs: 1 }).expect(200);

      const first = await as(app, user).post(`/api/generations/${id}/save`).expect(200);
      const second = await as(app, user).post(`/api/generations/${id}/save`).expect(200);
      expect(second.body.libraryItemId).toBe(first.body.libraryItemId);
      expect(first.body.generation.result.assets[0].saved).toBe(true);
      const asset = await prismaOf(app).asset.findFirstOrThrow({ where: { jobId: id } });
      expect(asset).toMatchObject({ retention: 'saved', expiresAt: null });
      expect(await prismaOf(app).userAttribute.count({ where: { userId: user.uid, attributeId: first.body.libraryItemId } })).toBe(1);
    });

    it('lists finals and kept previews with a stable cursor', async () => {
      const owner = await createUser('history');
      await signIn(app, owner);
      const session = await createSession(app, owner);
      for (let i = 1; i <= 5; i += 1) await submit(owner, baseRequest(session, { clientRevision: i, prompt: `final ${i}` })).expect(202);
      const first = await as(app, owner).get('/api/generations?limit=2').expect(200);
      const second = await as(app, owner).get(`/api/generations?limit=2&cursor=${first.body.nextCursor}`).expect(200);
      const third = await as(app, owner).get(`/api/generations?limit=2&cursor=${second.body.nextCursor}`).expect(200);
      const ids = [...first.body.items, ...second.body.items, ...third.body.items].map((item: { id: string }) => item.id);
      expect(ids).toHaveLength(5);
      expect(new Set(ids).size).toBe(5);
      expect(third.body.nextCursor).toBeNull();
      await as(app, owner).get('/api/generations?cursor=garbage').expect(400);
    });
  });

  describe('assets', () => {
    it('validates uploads by decoding them and serves them only with authorization', async () => {
      const png = await makePng({ r: 200, g: 20, b: 20 }, 48);
      const ok = await as(app, user).post('/api/uploads').attach('file', png, { filename: 'x.png', contentType: 'image/png' }).expect(201);
      expect(ok.body).toMatchObject({ mimeType: 'image/png', width: 48, height: 48 });

      await as(app, user).post('/api/uploads').attach('file', Buffer.from('not an image'), { filename: 'x.png', contentType: 'image/png' }).expect(400);
      await as(app, user).post('/api/uploads').attach('file', png, { filename: 'x.gif', contentType: 'image/gif' }).expect(400);

      const url = new URL(ok.body.url);
      const content = await as(app, user).get(`${url.pathname}${url.search}`).expect(200);
      expect(content.headers['content-type']).toBe('image/png');
      await as(app, user).get(`/api/assets/${ok.body.assetId}/content?access=bogus`).expect(200); // owner Bearer still authorizes
      const other = await createUser('stranger');
      await signIn(app, other);
      await as(app, other).get(`/api/assets/${ok.body.assetId}/content?access=bogus`).expect(404);
      await as(app, other).get(`/api/assets/${ok.body.assetId}`).expect(404);
      const thumb = await as(app, user).get(`${url.pathname}${url.search}&thumbnail=true`).expect(200);
      expect(thumb.headers['content-type']).toBe('image/webp');
    });

    it('reports an expired preview explicitly', async () => {
      const png = await makePng({ r: 5, g: 5, b: 5 });
      const ok = await as(app, user).post('/api/uploads').attach('file', png, { filename: 'x.png', contentType: 'image/png' }).expect(201);
      await prismaOf(app).asset.update({ where: { id: ok.body.assetId }, data: { expiresAt: new Date(Date.now() - 1000) } });
      const gone = await as(app, user).get(`/api/assets/${ok.body.assetId}/content?access=${new URL(ok.body.url).searchParams.get('access')}`).expect(410);
      expect(gone.body.code).toBe('ASSET_EXPIRED');
    });
  });

  describe('realtime hints (V11)', () => {
    it('emits generation.updated only to the owner, and the REST snapshot is the source of truth', async () => {
      const stranger = await createUser('listener');
      await signIn(app, stranger);
      await app.listen(0);
      const url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
      const connect = (token: string) =>
        new Promise<ReturnType<typeof io>>((resolve) => {
          const socket = io(url, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
          socket.once('authenticated', () => resolve(socket));
        });
      const owner = await connect(user.token);
      const outsider = await connect(stranger.token);
      const received: Array<{ jobId: string; status: string; stateVersion: number }> = [];
      const leaked: unknown[] = [];
      owner.on('generation.updated', (e) => received.push(e));
      outsider.on('generation.updated', (e) => leaked.push(e));

      const { id, worker } = await startRunning();
      await worker.event(id, 'completed', { outputs: await worker.outputs(id), durationMs: 1 }).expect(200);
      await new Promise((r) => setTimeout(r, 300));
      owner.close();
      outsider.close();

      expect(leaked).toEqual([]);
      const mine = received.filter((e) => e.jobId === id);
      expect(mine.at(-1)).toMatchObject({ status: 'COMPLETED' });
      const versions = mine.map((e) => e.stateVersion);
      expect(versions).toEqual([...versions].sort((a, b) => a - b));
      expect((await snapshot(id)).stateVersion).toBe(mine.at(-1)!.stateVersion);
    });
  });
});
