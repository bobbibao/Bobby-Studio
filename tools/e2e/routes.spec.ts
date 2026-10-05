import { expect, test } from '@playwright/test';
import { createVerifiedUser } from './support/auth';
import { expectClean, signIn, watchPage } from './support/studio';

// Every routed page must render for a signed-in user without console errors, failed requests,
// server errors or third-party hosts. Catches regressions from removing legacy code.
const ROUTES = ['/', '/inspiration', '/projects', '/workspace', '/favorite', '/profile', '/assistant', '/generate'];

test('every routed page renders cleanly for a new account', async ({ page }) => {
  test.setTimeout(180_000);
  const diagnostics = watchPage(page);
  await signIn(page, await createVerifiedUser('routes'));
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.locator('#root')).not.toBeEmpty();
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
    await expect(page.locator('body'), `route ${route}`).not.toContainText(/something went wrong|unexpected error|undefined|\[object Object\]/i);
  }
  expectClean(diagnostics);
});

test('a new account sees an empty projects page, never fabricated projects', async ({ page }) => {
  await signIn(page, await createVerifiedUser('projects'));
  await page.goto('/projects');
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page.screenshot({ path: 'test-results/shots/projects-empty.png', fullPage: true });
  await expect(page.locator('body')).not.toContainText(/Design \d|Sample project|Lorem/i);
  await expect(page.locator('[id="GridView"] img')).toHaveCount(0);
});
