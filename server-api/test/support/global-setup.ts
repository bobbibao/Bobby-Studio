import { execFileSync } from 'child_process';
import { randomBytes } from 'crypto';
import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { Client } from 'pg';

/** Minimal dotenv reader: the integration suite derives its connection details from the dev .env. */
function readEnvFile(file: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

/**
 * Creates a disposable database for the run, applies every migration from scratch (which also
 * verifies the fresh-database path) and points the application at it. Redis uses a dedicated
 * database index and the Firebase Auth Emulator must be running (see scripts/doctor.mjs).
 */
export default async function globalSetup(): Promise<void> {
  const root = path.resolve(__dirname, '../..');
  const dev = readEnvFile(path.join(root, '.env'));
  const devUrl = new URL(dev.DATABASE_URL);
  const dbName = `bobby_test_${randomBytes(4).toString('hex')}`;

  const admin = new Client({ connectionString: devUrl.toString().replace(devUrl.pathname, '/postgres') });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${dbName}`);
  await admin.end();

  const testUrl = new URL(devUrl.toString());
  testUrl.pathname = `/${dbName}`;

  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    stdio: 'pipe',
  });

  Object.assign(process.env, {
    APP_ENV: 'test',
    NODE_ENV: 'test',
    DATABASE_URL: testUrl.toString(),
    SHADOW_DATABASE_URL: testUrl.toString(),
    REDIS_HOST: dev.REDIS_HOST,
    REDIS_PORT: dev.REDIS_PORT,
    REDIS_DB: '15',
    FIREBASE_PROJECT_ID: dev.FIREBASE_PROJECT_ID,
    FIREBASE_AUTH_EMULATOR_HOST: dev.FIREBASE_AUTH_EMULATOR_HOST,
    STORAGE_DRIVER: 'local',
    LOCAL_STORAGE_ROOT: mkdtempSync(path.join(tmpdir(), 'bobby-it-assets-')),
    WORKER_SERVICE_SECRET: `it-worker-${randomBytes(16).toString('hex')}`,
    ASSET_URL_SECRET: `it-assets-${randomBytes(16).toString('hex')}`,
    IMAGE_PROVIDER: dev.IMAGE_PROVIDER ?? 'openai',
    IMAGE_PROVIDER_MODE: 'simulated',
    ALLOWED_CORS_DOMAINS: 'http://localhost:4200',
    // Tests drive the dispatcher and reconciler explicitly instead of relying on timers.
    GENERATION_DISPATCHER: 'off',
    GENERATION_RECONCILER: 'off',
    GENERATION_MIN_PREVIEW_INTERVAL_MS: '0',
  });
  (globalThis as { __BOBBY_TEST_DB__?: { adminUrl: string; dbName: string } }).__BOBBY_TEST_DB__ = {
    adminUrl: devUrl.toString().replace(devUrl.pathname, '/postgres'),
    dbName,
  };
}
