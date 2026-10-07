import { defineConfig, devices } from '@playwright/test';

// The stack is started separately (node scripts/dev.mjs start). Browser checks run against the real
// frontend, API, worker, PostgreSQL, Redis, Firebase Auth Emulator and image simulator.
export default defineConfig({
  testDir: './e2e',
  // Allow the first Vite dependency optimization after a fresh Windows install.
  timeout: process.platform === 'win32' ? 180_000 : 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: './test-results',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Use installed Chrome on Windows; keep the existing CI Chromium path on Linux.
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : process.platform === 'win32'
        ? { channel: 'chrome' }
        : { executablePath: '/opt/pw-browsers/chromium' },
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
