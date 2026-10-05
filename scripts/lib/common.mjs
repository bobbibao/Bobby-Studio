// Shared helpers for the setup, doctor and dev scripts. No third-party dependencies.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA_DIR = path.join(ROOT, '.data');
export const APPS = ['server-api', 'worker', 'image-simulator', 'frontend', 'tools'];

export const PORTS = {
  api: 3000,
  workerHealth: 3100,
  frontend: 4200,
  simulator: 4010,
  authEmulator: 9099,
  postgres: 5432,
  redis: 6379,
};

export const FIREBASE_DEMO_PROJECT = 'demo-bobby-studio';

export function log(message = '') {
  try {
    process.stdout.write(`${message}\n`);
  } catch {
    /* stdout closed (for example piped to head) */
  }
}

export function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', ...options });
}

export function commandExists(command) {
  return run('sh', ['-c', `command -v ${command}`]).status === 0;
}

export function randomSecret(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

/** Parses a dotenv file into an ordered Map. Comments and blank lines are not preserved. */
export function readEnvFile(file) {
  const values = new Map();
  if (!existsSync(file)) return values;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    values.set(match[1], value);
  }
  return values;
}

/**
 * Ensures every key in `defaults` exists in the env file. Existing values are never
 * overwritten unless the key is listed in `forceKeys`. Values may be functions so secrets are
 * generated only when needed. Returns the names of added keys.
 */
export function ensureEnvFile(file, defaults, { forceKeys = [] } = {}) {
  const current = readEnvFile(file);
  const added = [];
  for (const [key, make] of Object.entries(defaults)) {
    if (!current.has(key) || current.get(key) === '' || forceKeys.includes(key)) {
      current.set(key, typeof make === 'function' ? make() : make);
      added.push(key);
    }
  }
  if (added.length > 0 || !existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    const body = [...current.entries()].map(([k, v]) => `${k}=${/[\s#"']/.test(v) ? JSON.stringify(v) : v}`).join('\n');
    writeFileSync(file, `${body}\n`, { mode: 0o600 });
    chmodSync(file, 0o600);
  }
  return added;
}

export function checkPort(port, host = '127.0.0.1', timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const finish = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

export async function httpOk(url, { timeoutMs = 2000, expect = (status) => status >= 200 && status < 300 } = {}) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return { ok: expect(response.status), status: response.status };
  } catch (error) {
    return { ok: false, status: 0, error: error.cause?.code ?? error.name };
  }
}

export async function waitFor(label, probe, { timeoutMs = 60000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await probe()) return true;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export function nodeMajor() {
  return Number(process.versions.node.split('.')[0]);
}

export function appDir(name) {
  return path.join(ROOT, name);
}
