import { expect, test } from '@playwright/test';
import { simulator } from './support/stack';
import { expectClean, recordSubmissions, signedInStudio, solidPng, watchPage } from './support/studio';

// Browser flows against the real frontend, API, worker, PostgreSQL, Redis, Auth Emulator and image simulator.
const PROMPT = 'A modern timber and glass home in soft morning light';
const promptField = (page: import('@playwright/test').Page) => page.getByLabel('Prompt', { exact: true }).first();
const generate = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Generate', exact: true }).first();
const credits = async (page: import('@playwright/test').Page) => Number(((await page.getByText(/^\d+ credits?$/).first().textContent()) ?? '').replace(/\D/g, ''));

test.beforeEach(async () => {
  await simulator('reset');
});

test('prompt-only manual generation completes, charges once, saves, downloads and survives a reload', async ({ page }) => {
  const diagnostics = watchPage(page);
  const submissions = recordSubmissions(page);
  await signedInStudio(page, 'manual');
  const before = await credits(page);

  await promptField(page).fill(PROMPT);
  await generate(page).click();

  const image = page.getByRole('img', { name: /timber and glass/i }).first();
  await expect(image).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await expect.poll(() => credits(page)).toBe(before - 1);

  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({ mode: 'text_to_image', intent: 'final' });
  expect(JSON.stringify(submissions[0].body)).not.toMatch(/base64|data:image/);

  await page.getByRole('button', { name: 'Save version' }).click();
  await expect(page.getByText('Saved').first()).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.png$/);

  // History is rebuilt from the server after a reload; the draft prompt comes back too.
  await page.reload();
  await expect(promptField(page)).toHaveValue(PROMPT);
  await expect(page.getByRole('img', { name: /timber and glass|result/i }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Session versions')).toBeVisible();
  expectClean(diagnostics);
});

test('realtime previews follow the latest input, stop when switched off, and a final is explicit', async ({ page }) => {
  const diagnostics = watchPage(page);
  const submissions = recordSubmissions(page);
  await signedInStudio(page, 'realtime');

  const toggle = page.getByRole('switch', { name: /Realtime/ });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  await promptField(page).pressSequentially('A concrete library', { delay: 25 });
  await expect.poll(() => submissions.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  await expect(page.getByRole('img', { name: /concrete library/i }).first()).toBeVisible({ timeout: 30_000 });
  // Typing fast must not produce one request per keystroke.
  expect(submissions.length).toBeLessThan(5);
  expect(submissions.every((s) => s.intent === 'preview')).toBe(true);

  await promptField(page).pressSequentially(' at dusk', { delay: 25 });
  await expect.poll(() => submissions.length, { timeout: 30_000 }).toBeGreaterThan(1);
  await expect(page.getByText(/Updating/).first()).toBeHidden({ timeout: 30_000 });

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  const count = submissions.length;
  await promptField(page).pressSequentially(' with warm light', { delay: 25 });
  await page.waitForTimeout(2500);
  expect(submissions.length).toBe(count);

  await generate(page).click();
  await expect.poll(() => submissions.filter((s) => s.intent === 'final').length).toBe(1);
  expectClean(diagnostics);
});

test('a sketch is exported once and submitted as sketch_to_image', async ({ page }) => {
  const diagnostics = watchPage(page);
  const submissions = recordSubmissions(page);
  await signedInStudio(page, 'sketch');
  await promptField(page).fill('Turn this outline into a building');
  await page.getByRole('tab', { name: 'Sketch' }).click();
  const canvas = page.getByLabel('Sketch canvas').first();
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.7);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.width * (0.2 + i * 0.05), box.y + box.height * (0.7 - (i % 3) * 0.1));
  await page.mouse.up();
  await generate(page).click();
  await expect(page.getByRole('img', { name: /outline into a building/i }).first()).toBeVisible({ timeout: 30_000 });
  expect(submissions).toHaveLength(1);
  expect(submissions[0].mode).toBe('sketch_to_image');
  expect(submissions[0].body).toHaveProperty('inputAssetId');
  expect(JSON.stringify(submissions[0].body)).not.toMatch(/base64|data:image/);
  expectClean(diagnostics);
});

test('a reference image is uploaded, validated and submitted as image_to_image', async ({ page }) => {
  const diagnostics = watchPage(page);
  const submissions = recordSubmissions(page);
  await signedInStudio(page, 'reference');
  await promptField(page).fill('Restyle this reference as a pavilion');
  await page.getByRole('tab', { name: 'Reference' }).click();

  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert').or(page.getByText(/PNG, JPEG|not supported|unsupported/i)).first()).toBeVisible();
  expect(submissions).toHaveLength(0);

  await input.setInputFiles({ name: 'reference.png', mimeType: 'image/png', buffer: solidPng(256, 256) });
  await expect(page.getByText('reference.png').first()).toBeVisible({ timeout: 20_000 });
  await generate(page).click();
  await expect(page.getByRole('img', { name: /pavilion/i }).first()).toBeVisible({ timeout: 30_000 });
  expect(submissions).toHaveLength(1);
  expect(submissions[0].mode).toBe('image_to_image');
  expectClean(diagnostics);
});

test('a provider failure is shown without raw provider text, credits come back, and Retry succeeds', async ({ page }) => {
  const diagnostics = watchPage(page);
  await signedInStudio(page, 'failure');
  const before = await credits(page);
  await simulator('scenario', { scenario: 'quota', times: 1 });
  await promptField(page).fill(PROMPT);
  await generate(page).click();

  await expect(page.getByText(/could not|failed|unavailable/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('body')).not.toContainText(/insufficient_quota|RESOURCE_EXHAUSTED|invalid_api_key|api key|quota/i);
  await expect.poll(() => credits(page)).toBe(before);

  await page.getByRole('button', { name: 'Retry' }).first().click();
  await expect(page.getByRole('img', { name: /timber and glass/i }).first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => credits(page)).toBe(before - 1);
  // Expected provider failure produces a 4xx/5xx-free UI path: console must stay clean.
  expect(diagnostics.badResponses).toEqual([]);
  expect(diagnostics.externalHosts.size).toBe(0);
});

test('Stop cancels a running generation on the server and returns the credits', async ({ page }) => {
  const diagnostics = watchPage(page);
  await signedInStudio(page, 'cancel');
  const before = await credits(page);
  await simulator('scenario', { scenario: 'timeout' });
  await promptField(page).fill(PROMPT);
  await generate(page).click();
  const stop = page.getByRole('button', { name: 'Stop' }).first();
  await expect(stop).toBeVisible({ timeout: 15_000 });
  await stop.click();
  await expect(page.getByText(/cancelled|canceled|stopped/i).first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => credits(page), { timeout: 30_000 }).toBe(before);
  await simulator('reset');
  expect(diagnostics.externalHosts.size).toBe(0);
});

test('a dropped connection is recovered from the server without resubmitting', async ({ page, context }) => {
  const diagnostics = watchPage(page);
  const submissions = recordSubmissions(page);
  await signedInStudio(page, 'reconnect');
  await simulator('scenario', { scenario: 'unavailable', times: 2 });
  await promptField(page).fill(PROMPT);
  await generate(page).click();
  await expect.poll(() => submissions.length).toBe(1);
  await context.setOffline(true);
  await page.waitForTimeout(1500);
  await context.setOffline(false);
  await expect(page.getByRole('img', { name: /timber and glass/i }).first()).toBeVisible({ timeout: 45_000 });
  expect(submissions).toHaveLength(1);
  expect(diagnostics.externalHosts.size).toBe(0);
});

test('two accounts never see each other\'s studio data', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  await signedInStudio(pageA, 'owner-a');
  await promptField(pageA).fill('Private prompt of account A');
  await generate(pageA).click();
  await expect(pageA.getByRole('img', { name: /Private prompt of account A/i }).first()).toBeVisible({ timeout: 30_000 });

  await signedInStudio(pageB, 'owner-b');
  await expect(promptField(pageB)).toHaveValue('');
  await expect(pageB.locator('body')).not.toContainText('Private prompt of account A');
  await expect(pageB.getByText('Session versions')).toBeVisible();
  await expect(pageB.getByRole('img', { name: /Private prompt/i })).toHaveCount(0);

  await contextA.close();
  await contextB.close();
});
