import { expect, test } from '@playwright/test';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { ApiUser, call, generationRequest, signUpApiUser, simulator, simulatorRequestCount, waitFor, waitForTerminal } from './support/stack';

// V12/V18: the API dies while the worker is between "provider answered" and "result acknowledged".
// Recovery must yield exactly one result and one charge, and must never repeat the provider call.
test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const root = path.resolve(__dirname, '../..');
const apiPidFile = path.join(root, '.data/pids/api.pid');

const killApi = () => process.kill(Number(readFileSync(apiPidFile, 'utf8')), 'SIGKILL');
const startApi = () => execFileSync(process.execPath, [path.join(root, 'scripts/dev.mjs'), 'start', '--only=api'], { cwd: root, stdio: 'ignore' });

let user: ApiUser;

test.beforeEach(async () => {
  await simulator('reset');
  user = await signUpApiUser('e2e-recovery');
});

async function submitAndCrashApi(): Promise<string> {
  const session = (await call(user, '/studio-sessions', { method: 'POST' })).body.id;
  const accepted = await call(user, '/generations', {
    method: 'POST',
    headers: { 'idempotency-key': randomUUID() },
    body: JSON.stringify(generationRequest(session)),
  });
  await waitFor('the provider call to start', async () => (await simulatorRequestCount()) >= 1);
  killApi();
  return accepted.body.id;
}

for (const [name, downMs] of [
  ['short API outage: delivery retries reach the restarted API', 2_500],
  ['long API outage: the queue retries and the stored result is recovered without a second provider call', 16_000],
] as const) {
  test(name, async () => {
    const before = (await call(user, '/credits/balance')).body;
    const id = await submitAndCrashApi();
    await new Promise((resolve) => setTimeout(resolve, downMs));
    startApi();

    const done = await waitForTerminal(user, id, 60_000);
    expect(done.status).toBe('COMPLETED');
    expect(await simulatorRequestCount()).toBe(1);
    const after = (await call(user, '/credits/balance')).body;
    expect(after).toEqual({ available: before.available - done.creditCost, reserved: 0 });
    const image = await fetch(done.result.assets[0].url);
    expect(image.status).toBe(200);
  });
}
