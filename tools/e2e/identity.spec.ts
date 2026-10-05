import { expect, test } from '@playwright/test';
import { createVerifiedUser } from './support/auth';

test.describe('identity', () => {
  test('anonymous visitors are sent to sign-in, and a verified user reaches the app', async ({ page }) => {
    const user = await createVerifiedUser('identity');
    const consoleErrors: string[] = [];
    const externalHosts = new Set<string>();
    const apiAuth: Array<{ url: string; authorized: boolean }> = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) externalHosts.add(url.hostname);
      if (url.port === new URL(process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api').port) {
        apiAuth.push({ url: `${url.pathname}`, authorized: Boolean(request.headers()['authorization']) });
      }
    });

    await page.goto('/');
    await expect(page).toHaveURL(/\/auth\/sign-in/);

    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(user.password);
    await page.keyboard.press('Enter');

    await expect(page).not.toHaveURL(/\/auth\//, { timeout: 30_000 });
    await expect(page.locator('#root')).not.toBeEmpty();

    // Every API call after sign-in carries the Firebase ID token; none uses a bypass.
    expect(apiAuth.length).toBeGreaterThan(0);
    expect(apiAuth.filter((call) => !call.authorized && !call.url.endsWith('/health/live'))).toEqual([]);
    // No requests to third-party hosts in development (analytics, chat widgets, public inference).
    expect([...externalHosts]).toEqual([]);
    expect(consoleErrors.filter((text) => !/favicon|Failed to load resource.*(404)/.test(text))).toEqual([]);
  });
});
