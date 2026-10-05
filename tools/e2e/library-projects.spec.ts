import { expect, test } from '@playwright/test';
import { createVerifiedUser } from './support/auth';
import { expectClean, signIn, signedInStudio, watchPage } from './support/studio';
import { simulator } from './support/stack';
import { randomUUID } from 'crypto';

test.use({ actionTimeout: 10_000 });

test('project and folder CRUD persist after reload and each project delete has one request', async ({ page }) => {
  const diagnostics = watchPage(page);
  await signIn(page, await createVerifiedUser('project-crud'));
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Create Project', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'Project Name', exact: true }).fill('Browser QA project');
  await page.getByRole('textbox', { name: 'Project Description', exact: true }).fill('Persistent local test');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.reload();
  await expect(page.getByRole('img', { name: 'Browser QA project', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Project Name', exact: true })).toHaveValue('Browser QA project');
  await page.getByRole('textbox', { name: 'Project Name', exact: true }).fill('Renamed QA project');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('img', { name: 'Renamed QA project', exact: true })).toBeVisible();
  await page.getByRole('img', { name: 'Renamed QA project', exact: true }).click();
  await page.getByRole('button', { name: 'Create Folder', exact: true }).click();
  await page.getByRole('textbox', { name: 'Folder Name', exact: true }).fill('QA folder');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('paragraph').filter({ hasText: /^QA folder$/ })).toBeVisible();
  await page.reload();
  await page.getByRole('img', { name: 'Renamed QA project', exact: true }).click();
  await expect(page.getByRole('paragraph').filter({ hasText: /^QA folder$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Folder Name', exact: true }).fill('Renamed QA folder');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('paragraph').filter({ hasText: /^Renamed QA folder$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Renamed QA folder', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Project', exact: true }).first().click();
  const deletions: string[] = [];
  page.on('request', request => {
    if (request.method() === 'PUT' && request.url().includes('/attributes/deactivate/')) deletions.push(request.url());
  });
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No Projects Yet' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'No Projects Yet' })).toBeVisible();
  expect(deletions).toHaveLength(1);
  expectClean(diagnostics);
});

test('saved images decode, move between folders and persist after reload', async ({ page }) => {
  const diagnostics = watchPage(page);
  await simulator('reset');
  await signedInStudio(page, 'saved-library');
  await page.getByLabel('Prompt', { exact: true }).first().fill('A bright blue QA pavilion');
  await page.getByRole('button', { name: 'Generate', exact: true }).first().click();
  await expect(page.getByRole('img', { name: /bright blue QA pavilion/i }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Save version' }).click();
  await expect(page.getByText('Saved').first()).toBeVisible();
  await page.getByLabel('Prompt', { exact: true }).first().fill('A second green QA pavilion');
  await page.getByRole('button', { name: 'Generate', exact: true }).first().click();
  await expect(page.getByRole('img', { name: /second green QA pavilion/i }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Save version' }).click();
  await expect(page.getByText('Saved').first()).toBeVisible();
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Unassigned', exact: true }).click();
  const image = page.locator('main img').first();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await page.reload();
  await page.getByRole('button', { name: 'Unassigned', exact: true }).click();
  await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/shots/saved-library.png', fullPage: true });
  await page.getByRole('button', { name: 'Project', exact: true }).first().click();
  await page.getByRole('button', { name: 'Create Project', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'Project Name', exact: true }).fill('Image organization');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('img', { name: 'Image organization', exact: true }).click();
  for (const folder of ['Source folder', 'Destination folder']) {
    await page.getByRole('button', { name: 'Create Folder', exact: true }).click();
    await page.getByRole('textbox', { name: 'Folder Name', exact: true }).fill(folder);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('paragraph').filter({ hasText: new RegExp(folder) })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Unassigned', exact: true }).click();
  for (let index = 0; index < 2; index++) {
  await page.getByRole('button', { name: 'Options', exact: true }).first().click();
  await page.getByRole('menuitem', { name: 'Move', exact: true }).click();
  await page.getByRole('dialog').getByText('Image organization', { exact: true }).click();
  await page.getByRole('dialog').getByText('Source folder', { exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move', exact: true }).click();
    await expect(page.locator('main [data-id]')).toHaveCount(1 - index);
  }
  await expect(page.locator('main [data-id]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Project', exact: true }).first().click();
  await page.getByRole('img', { name: 'Image organization', exact: true }).click();
  await expect.poll(() => page.locator('main img').last().evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('main [data-id]')).toHaveCount(2);
  for (let index = 0; index < 2; index++) {
    await page.locator('main [data-id]').nth(index).hover();
    await page.getByRole('checkbox').nth(index).press('Space');
    await expect(page.getByRole('checkbox').nth(index)).toBeChecked();
  }
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByText('Image organization', { exact: true }).click();
  await page.getByRole('dialog').getByText('Destination folder', { exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.reload();
  await page.getByRole('img', { name: 'Image organization', exact: true }).click();
  await page.getByRole('paragraph').filter({ hasText: /^Source folder$/ }).click();
  await expect(page.locator('main [data-id]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Project', exact: true }).first().click();
  await page.getByRole('img', { name: 'Image organization', exact: true }).click();
  await page.getByRole('paragraph').filter({ hasText: /^Destination folder$/ }).click();
  await expect(page.locator('main [data-id]')).toHaveCount(2);
  expectClean(diagnostics);
});

test('auth labels are translated for English and regional language settings', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en-US'));
  await page.goto('/auth/sign-in');
  await expect(page.getByRole('heading', { name: 'Log in to your account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await page.goto('/auth/sign-up');
  await expect(page.locator('main')).not.toContainText(/sign_up_to|enter_your|password_is_required|email_is_required/);
});

test('browser signup can continue after the official emulator verifies the email', async ({ page }) => {
  const diagnostics = watchPage(page);
  const email = `signup-ui-${randomUUID()}@example.test`;
  await page.goto('/auth/sign-up');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Passw0rd!e2e-test');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Verify Your Email Address', { exact: true })).toBeVisible();
  const verified = page.getByRole('button', { name: "I'm Verified", exact: true });
  await verified.click();
  await expect(page.getByText('Email not verified yet', { exact: true })).toBeVisible();
  const emulator = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'}`;
  const project = process.env.FIREBASE_PROJECT_ID ?? 'demo-bobby-studio';
  const codes = await (await fetch(`${emulator}/emulator/v1/projects/${project}/oobCodes`)).json();
  const code = codes.oobCodes.find((entry: { email: string; requestType: string }) => entry.email === email && entry.requestType === 'VERIFY_EMAIL');
  expect(code).toBeDefined();
  const applied = await fetch(`${emulator}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: code.oobCode }),
  });
  expect(applied.ok).toBe(true);
  await verified.click();
  await expect(page).not.toHaveURL(/\/auth\//);
  await page.goto('/generate');
  await expect(page.getByLabel('Prompt', { exact: true }).first()).toBeVisible();
  // First-time onboarding includes the existing YouTube tutorial embed.
  expect([...diagnostics.externalHosts].every((host) => host === 'www.youtube.com')).toBe(true);
  diagnostics.externalHosts.delete('www.youtube.com');
  expectClean(diagnostics);
});
