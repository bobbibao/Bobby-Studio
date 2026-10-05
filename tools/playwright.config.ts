import { defineConfig, devices } from '@playwright/test';

// The stack is started separately (node scripts/dev.mjs start). Browser checks run against the real
// frontend, API, worker, PostgreSQL, Redis, Firebase Auth Emulator and image simulator.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: './test-results',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' },
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
