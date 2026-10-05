import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');

function envOf(file: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of readFileSync(path.join(root, file), 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

const worker = envOf('worker/.env');
export const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api';
const EMULATOR = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';

export interface ApiUser {
  token: string;
  uid: string;
  email: string;
}

export async function signUpApiUser(label: string): Promise<ApiUser> {
  const email = `${label}-${randomUUID().slice(0, 8)}@example.test`;
  const response = await fetch(`http://${EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Passw0rd!e2e-test', returnSecureToken: true }),
  });
  const body = (await response.json()) as { idToken: string; localId: string };
  return { token: body.idToken, uid: body.localId, email };
}

export async function call<T = any>(user: ApiUser, apiPath: string, init: RequestInit = {}): Promise<{ status: number; body: T; headers: Headers }> {
  const response = await fetch(`${API}${apiPath}`, {
    ...init,
    headers: { authorization: `Bearer ${user.token}`, ...(init.body && !(init.body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) },
  });
  return { status: response.status, body: (await response.json().catch(() => null)) as T, headers: response.headers };
}

/** Control endpoint of the development image simulator (key-protected). */
export async function simulator(action: 'scenario' | 'reset', body?: object): Promise<void> {
  const base = worker.IMAGE_PROVIDER_BASE_URL;
  const response = await fetch(`${base}/__sim/${action}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${worker.IMAGE_PROVIDER_API_KEY}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`simulator control failed (${response.status})`);
}

export const generationRequest = (studioSessionId: string, overrides: Record<string, unknown> = {}) => ({
  studioSessionId,
  clientRevision: 1,
  intent: 'final',
  modelId: 'simulated-openai-image',
  mode: 'text_to_image',
  prompt: 'A modern timber and glass home in soft morning light',
  size: { width: 1024, height: 1024 },
  quality: 'preview',
  ...overrides,
});

export async function waitForTerminal(user: ApiUser, id: string, timeoutMs = 30_000) {
  const started = Date.now();
  for (;;) {
    const { body } = await call(user, `/generations/${id}`);
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(body.status)) return body;
    if (Date.now() - started > timeoutMs) throw new Error(`generation did not finish: ${JSON.stringify(body)}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

export async function simulatorRequestCount(): Promise<number> {
  const response = await fetch(`${worker.IMAGE_PROVIDER_BASE_URL}/__sim/requests`, {
    headers: { authorization: `Bearer ${worker.IMAGE_PROVIDER_API_KEY}` },
  });
  return ((await response.json()) as { received: number }).received;
}

export async function waitFor(label: string, probe: () => Promise<boolean>, timeoutMs = 20_000, intervalMs = 100): Promise<void> {
  const started = Date.now();
  while (!(await probe())) {
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
