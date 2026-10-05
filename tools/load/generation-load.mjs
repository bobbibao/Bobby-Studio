#!/usr/bin/env node
// Closed-loop load test against the running local stack (API + worker + fixed-latency simulator).
//
//   node load/generation-load.mjs --users 10 --seconds 30 [--think-ms 500]
//
// Each virtual user owns an account and a studio session and repeatedly submits an explicit final, waits for it
// to reach a terminal state, then thinks. Only the simulator is simulated: auth, admission, database,
// outbox, queue, worker and storage are real. Never point this at a live provider.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, arg, i, all) => (arg.startsWith('--') ? [...acc, [arg.slice(2), all[i + 1]]] : acc), []));
const USERS = Number(args.users ?? 10);
const SECONDS = Number(args.seconds ?? 30);
const THINK_MS = Number(args['think-ms'] ?? 500);
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api';
const root = path.resolve(new URL('.', import.meta.url).pathname, '../..');

const env = (file) => Object.fromEntries(readFileSync(path.join(root, file), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const apiEnv = env('server-api/.env');
const workerEnv = env('worker/.env');
if (workerEnv.IMAGE_PROVIDER_MODE !== 'simulated') throw new Error('Refusing to run: the worker is not in simulated mode.');

const pct = (values, p) => (values.length ? [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor((p / 100) * values.length))] : 0);
const rss = (name) => {
  try {
    const pid = readFileSync(path.join(root, `.data/pids/${name}.pid`), 'utf8').trim();
    return Math.round(Number(execFileSync('ps', ['-o', 'rss=', '-p', pid]).toString().trim()) / 1024);
  } catch {
    return null;
  }
};

async function signUp(i) {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=k', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `load-${i}-${randomUUID().slice(0, 6)}@example.test`, password: 'Passw0rd!load', returnSecureToken: true }),
  });
  return (await response.json()).idToken;
}

const stats = { submitMs: [], e2eMs: [], accepted: 0, completed: 0, failed: 0, throttled: 0, other: 0, errors: {} };
let peakPendingAge = 0;
let peakBacklog = 0;

async function virtualUser(i, deadline) {
  const token = await signUp(i);
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const session = (await (await fetch(`${API}/studio-sessions`, { method: 'POST', headers })).json()).id;
  let revision = 0;
  // Stagger starts so the burst is not artificially synchronized.
  await new Promise((r) => setTimeout(r, Math.random() * 500));
  while (Date.now() < deadline) {
    revision += 1;
    const body = JSON.stringify({ studioSessionId: session, clientRevision: revision, intent: 'final', modelId: 'simulated-openai-image', mode: 'text_to_image', prompt: `load ${i} ${revision}`, size: { width: 1024, height: 1024 }, quality: 'preview' });
    const t0 = performance.now();
    const response = await fetch(`${API}/generations`, { method: 'POST', headers: { ...headers, 'idempotency-key': randomUUID() }, body });
    stats.submitMs.push(performance.now() - t0);
    if (response.status === 429) {
      stats.throttled += 1;
      await new Promise((r) => setTimeout(r, Number(response.headers.get('retry-after') ?? 1) * 1000));
      revision -= 1;
      continue;
    }
    if (response.status === 402) {
      stats.errors.credits = (stats.errors.credits ?? 0) + 1;
      return;
    }
    if (response.status !== 202) {
      stats.other += 1;
      stats.errors[response.status] = (stats.errors[response.status] ?? 0) + 1;
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    stats.accepted += 1;
    const { id } = await response.json();
    for (;;) {
      await new Promise((r) => setTimeout(r, 120));
      const snap = await (await fetch(`${API}/generations/${id}`, { headers })).json();
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(snap.status)) {
        if (snap.status === 'COMPLETED') {
          stats.completed += 1;
          stats.e2eMs.push(performance.now() - t0);
        } else stats.failed += 1;
        break;
      }
      if (Date.now() > deadline + 60_000) return;
    }
    await new Promise((r) => setTimeout(r, THINK_MS));
  }
}

async function sampleMetrics(until) {
  const token = apiEnv.METRICS_TOKEN;
  if (!token) return;
  while (Date.now() < until) {
    const text = await (await fetch(`${API}/metrics`, { headers: { authorization: `Bearer ${token}` } })).text().catch(() => '');
    const read = (name) => Number(new RegExp(`^${name}(?:\\{[^}]*\\})? (\\S+)$`, 'm').exec(text)?.[1] ?? 0);
    peakPendingAge = Math.max(peakPendingAge, read('bobby_generation_oldest_pending_seconds'));
    peakBacklog = Math.max(peakBacklog, read('bobby_queue_waiting'));
    await new Promise((r) => setTimeout(r, 500));
  }
}

const started = Date.now();
const deadline = started + SECONDS * 1000;
const sampler = sampleMetrics(deadline + 5000);
await Promise.all(Array.from({ length: USERS }, (_, i) => virtualUser(i, deadline)));
await sampler;
const elapsed = (Date.now() - started) / 1000;

const redisMemory = (() => {
  try {
    return execFileSync('redis-cli', ['info', 'memory']).toString().match(/used_memory_human:(\S+)/)?.[1];
  } catch {
    return null;
  }
})();
const dbConnections = (() => {
  try {
    return Number(execFileSync('psql', [apiEnv.DATABASE_URL, '-tAc', "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"]).toString().trim());
  } catch {
    return null;
  }
})();

console.log(JSON.stringify({
  workload: { users: USERS, seconds: SECONDS, thinkMs: THINK_MS, simulatorLatencyMs: Number(apiEnv.SIMULATOR_LATENCY_MS ?? 800), workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? workerEnv.WORKER_CONCURRENCY) },
  elapsedSeconds: Math.round(elapsed),
  offered: stats.accepted + stats.throttled,
  accepted: stats.accepted,
  acceptedPerSecond: +(stats.accepted / elapsed).toFixed(2),
  completed: stats.completed,
  completedPerSecond: +(stats.completed / elapsed).toFixed(2),
  failed: stats.failed,
  throttled: stats.throttled,
  otherErrors: stats.errors,
  submitLatencyMs: { p50: Math.round(pct(stats.submitMs, 50)), p95: Math.round(pct(stats.submitMs, 95)), p99: Math.round(pct(stats.submitMs, 99)) },
  endToEndMs: { p50: Math.round(pct(stats.e2eMs, 50)), p95: Math.round(pct(stats.e2eMs, 95)), p99: Math.round(pct(stats.e2eMs, 99)) },
  peakOldestPendingSeconds: +peakPendingAge.toFixed(1),
  peakQueueWaiting: peakBacklog,
  rssMb: { api: rss('api'), worker: rss('worker') },
  redisUsedMemory: redisMemory,
  dbConnections,
}, null, 2));
