import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ApiUser, call, generationRequest, signUpApiUser, simulator, waitForTerminal } from './support/stack';

// Real API + worker + simulator + PostgreSQL + Redis. Only image inference is simulated.
test.describe.configure({ mode: 'serial' });

let user: ApiUser;
let sessionId: string;

const submit = (body: object, key: string = randomUUID()) =>
  call(user, '/generations', { method: 'POST', headers: { 'idempotency-key': key }, body: JSON.stringify(body) });

test.beforeEach(async () => {
  await simulator('reset');
  user = await signUpApiUser('e2e-gen');
  sessionId = (await call(user, '/studio-sessions', { method: 'POST' })).body.id;
});

test('generates through the real worker and simulator, charges once and serves the image', async () => {
  const before = (await call(user, '/credits/balance')).body;
  const accepted = await submit(generationRequest(sessionId));
  expect(accepted.status).toBe(202);

  const done = await waitForTerminal(user, accepted.body.id);
  expect(done).toMatchObject({ status: 'COMPLETED', isSimulated: true, error: null });
  const image = await fetch(done.result.assets[0].url);
  const bytes = Buffer.from(await image.arrayBuffer());
  expect(image.status).toBe(200);
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1024, 1024]);

  expect((await call(user, '/credits/balance')).body).toEqual({ available: before.available - done.creditCost, reserved: 0 });
  const saved = await call(user, `/generations/${done.id}/save`, { method: 'POST' });
  expect(saved.body.generation.result.assets[0].saved).toBe(true);
  const history = await call(user, '/generations?limit=5');
  expect(history.body.items.map((item: { id: string }) => item.id)).toContain(done.id);
});

test('recovers from a transient provider failure through the queue without charging twice', async () => {
  const before = (await call(user, '/credits/balance')).body;
  await simulator('scenario', { scenario: 'unavailable', times: 1 });
  const accepted = await submit(generationRequest(sessionId));
  const done = await waitForTerminal(user, accepted.body.id);
  expect(done.status).toBe('COMPLETED');
  expect((await call(user, '/credits/balance')).body.available).toBe(before.available - 1);
});

test('fails permanently on exhausted quota, releases the credits and allows an explicit retry', async () => {
  const before = (await call(user, '/credits/balance')).body;
  await simulator('scenario', { scenario: 'quota', times: 1 });
  const accepted = await submit(generationRequest(sessionId));
  const failed = await waitForTerminal(user, accepted.body.id);
  expect(failed).toMatchObject({ status: 'FAILED', error: { code: 'PROVIDER_QUOTA_EXHAUSTED' } });
  expect((await call(user, '/credits/balance')).body).toEqual(before);

  const retried = await call(user, `/generations/${failed.id}/retry`, { method: 'POST', headers: { 'idempotency-key': randomUUID() } });
  expect(retried.status).toBe(202);
  expect((await waitForTerminal(user, retried.body.id)).status).toBe('COMPLETED');
});

test('replaying the same Idempotency-Key recovers the same job and does not charge again', async () => {
  const key = randomUUID();
  const first = await submit(generationRequest(sessionId), key);
  const replay = await submit(generationRequest(sessionId), key);
  expect(replay.body.id).toBe(first.body.id);
  const done = await waitForTerminal(user, first.body.id);
  const balance = (await call(user, '/credits/balance')).body;
  expect(balance.reserved).toBe(0);
  expect(done.status).toBe('COMPLETED');
});

test('cancelling queued work stops it and a second user can neither see nor cancel it', async () => {
  const stranger = await signUpApiUser('e2e-stranger');
  await simulator('scenario', { scenario: 'timeout', times: 1 });
  const accepted = await submit(generationRequest(sessionId, { prompt: 'will be cancelled' }));
  expect((await call(stranger, `/generations/${accepted.body.id}`)).status).toBe(404);
  expect((await call(stranger, `/generations/${accepted.body.id}/cancel`, { method: 'POST' })).status).toBe(404);

  const cancelled = await call(user, `/generations/${accepted.body.id}/cancel`, { method: 'POST' });
  expect(cancelled.status).toBe(200);
  expect(cancelled.body.status).toBe('CANCELLED');
  expect((await call(user, '/credits/balance')).body.reserved).toBe(0);
});

test('validation errors are explicit and never silently dropped', async () => {
  const bad = await submit(generationRequest(sessionId, { size: { width: 333, height: 333 } }));
  expect(bad.status).toBe(422);
  expect(bad.body).toMatchObject({ code: 'UNSUPPORTED_CAPABILITY', fieldErrors: [{ field: 'size' }] });
  expect((await call(user, '/generations', { method: 'POST', body: JSON.stringify(generationRequest(sessionId)) })).status).toBe(400);
});
