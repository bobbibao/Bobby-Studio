import { expect, type Page } from '@playwright/test';
import { createVerifiedUser, type E2EUser } from './auth';

export interface Diagnostics {
  consoleErrors: string[];
  failedRequests: string[];
  externalHosts: Set<string>;
  badResponses: string[];
}

/** Collects the signals every browser flow must keep clean: console errors, failed or 5xx requests, third-party hosts. */
export function watchPage(page: Page): Diagnostics {
  const diagnostics: Diagnostics = { consoleErrors: [], failedRequests: [], externalHosts: new Set(), badResponses: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => diagnostics.consoleErrors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? '';
    // Navigations and aborted fetches (route changes, cancelled previews) are not failures.
    if (!/ERR_ABORTED/.test(failure)) diagnostics.failedRequests.push(`${request.method()} ${request.url()} ${failure}`);
  });
  page.on('request', (request) => {
    const { protocol, hostname } = new URL(request.url());
    // blob: and data: URLs are local previews, not network hosts.
    if (/^https?:$/.test(protocol) && !['127.0.0.1', 'localhost'].includes(hostname)) diagnostics.externalHosts.add(hostname);
  });
  page.on('response', (response) => {
    if (response.status() >= 500) diagnostics.badResponses.push(`${response.status()} ${response.url()}`);
  });
  return diagnostics;
}

export async function signIn(page: Page, user: E2EUser): Promise<void> {
  await page.goto('/auth/sign-in');
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.keyboard.press('Enter');
  await expect(page).not.toHaveURL(/\/auth\//, { timeout: 30_000 });
}

export async function signedInStudio(page: Page, label: string): Promise<E2EUser> {
  const user = await createVerifiedUser(label);
  await signIn(page, user);
  await page.goto('/generate');
  await expect(page.getByLabel('Prompt', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  return user;
}

/** A valid RGB PNG built in-process (no image dependency in the tools package). */
export function solidPng(width: number, height: number, rgb: [number, number, number] = [200, 120, 60]): Buffer {
  const { deflateSync } = require('zlib') as typeof import('zlib');
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => rgb).flat())]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

export interface SubmittedGeneration {
  mode: string;
  intent: string;
  body: Record<string, unknown>;
}

/** Records the body of every POST /generations the browser sends. */
export function recordSubmissions(page: Page): SubmittedGeneration[] {
  const submissions: SubmittedGeneration[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/api\/generations$/.test(new URL(request.url()).pathname)) {
      const body = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      submissions.push({ mode: String(body.mode), intent: String(body.intent), body });
    }
  });
  return submissions;
}

export function expectClean(diagnostics: Diagnostics): void {
  expect(diagnostics.consoleErrors, 'console errors').toEqual([]);
  expect(diagnostics.failedRequests, 'failed requests').toEqual([]);
  expect(diagnostics.badResponses, '5xx responses').toEqual([]);
  expect([...diagnostics.externalHosts], 'third-party hosts').toEqual([]);
}
