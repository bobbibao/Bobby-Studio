import { expect, test } from '@playwright/test';
import { simulator } from './support/stack';
import { expectClean, signedInStudio, watchPage } from './support/studio';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`studio is usable and does not overflow at ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
    await simulator('reset');
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const diagnostics = watchPage(page);
    await signedInStudio(page, `resp-${viewport.name}`);

    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `test-results/shots/${viewport.name}-empty.png`, fullPage: true });

    const longPrompt = 'Ünïcödé 建築 '.repeat(40) + 'A_very_long_unbroken_token_'.repeat(8);
    await page.getByLabel('Prompt', { exact: true }).first().fill(longPrompt);
    expect(await overflow()).toBeLessThanOrEqual(0);

    const generate = page.getByRole('button', { name: 'Generate', exact: true }).first();
    await expect(generate).toBeVisible();
    if (viewport.name === 'mobile') {
      const box = (await generate.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await generate.click();
    // On mobile the result lives on its own tab and is announced there.
    const resultTab = page.getByRole('tab', { name: /Result/i });
    if (await resultTab.count()) await resultTab.first().click();
    await expect(page.getByRole('img', { name: /Ünïcödé|Result|result/i }).first()).toBeVisible({ timeout: 30_000 });
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `test-results/shots/${viewport.name}-result.png`, fullPage: true });

    if (viewport.name === 'tablet') {
      await page.getByRole('button', { name: 'Settings' }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
    }
    if (viewport.name === 'mobile') {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      const close = page.getByRole('button', { name: 'Close sidebar' });
      await expect(close).toBeVisible();
      await close.click();
      await expect(close).toBeHidden();
      expect(await overflow()).toBeLessThanOrEqual(0);
    }
    expectClean(diagnostics);
  });
}
