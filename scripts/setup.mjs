#!/usr/bin/env node
// Idempotent local environment setup for Bobby Studio.
//
//   node scripts/setup.mjs [--install] [--rotate-secrets] [--skip-db] [--skip-install]
//
// - Installs dependencies from each app's lockfile when node_modules is missing (or --install).
// - Generates ignored env files with restricted permissions. Existing values are preserved;
//   secrets are regenerated only with --rotate-secrets.
// - Provisions the local development database, applies migrations and idempotent seeds.
// Secret values are never printed.
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  APPS,
  DATA_DIR,
  FIREBASE_DEMO_PROJECT,
  PORTS,
  ROOT,
  appDir,
  commandExists,
  ensureEnvFile,
  log,
  nodeMajor,
  randomSecret,
  readEnvFile,
  run,
} from './lib/common.mjs';

const args = new Set(process.argv.slice(2));
const rotate = args.has('--rotate-secrets');
const summary = [];

function step(title) {
  log(`\n== ${title}`);
}

function fail(message) {
  log(`\nSetup stopped: ${message}`);
  process.exit(1);
}

step('Toolchain');
if (nodeMajor() < 20) fail(`Node.js >= 20 is required (found ${process.versions.node}).`);
if (!commandExists('yarn')) fail('Yarn 1.x is required (corepack enable, or npm install -g yarn).');
const yarnVersion = run('yarn', ['--version']).stdout?.trim() ?? '';
if (!yarnVersion.startsWith('1.')) fail('Yarn 1.x is required. Install locally with: npm install --prefix .data/toolchain yarn@1.22.22 --no-audit --no-fund');
log(`node ${process.versions.node}, yarn ${yarnVersion}`);

step('Dependencies (from lockfiles)');
for (const app of APPS) {
  const dir = appDir(app);
  if (!existsSync(path.join(dir, 'package.json')) || !existsSync(path.join(dir, 'yarn.lock'))) continue;
  const installed = existsSync(path.join(dir, 'node_modules'));
  if (installed && !args.has('--install')) {
    log(`${app}: node_modules present (skipped; use --install to refresh)`);
    continue;
  }
  if (args.has('--skip-install')) {
    log(`${app}: install skipped by flag`);
    continue;
  }
  log(`${app}: yarn install --frozen-lockfile`);
  // Installs run sequentially: parallel yarn processes corrupt the shared package cache.
  const result = run('yarn', ['install', '--frozen-lockfile'], { cwd: dir, stdio: 'inherit' });
  if (result.status !== 0) fail(`dependency install failed in ${app}`);
}

step('Local data directories');
const assetsRoot = path.join(DATA_DIR, 'assets');
for (const dir of [assetsRoot, path.join(DATA_DIR, 'logs'), path.join(DATA_DIR, 'pids')]) {
  mkdirSync(dir, { recursive: true });
}
log(`.data/{assets,logs,pids} ready (ignored by git)`);

step('Environment files (values are never printed)');
const apiEnvFile = path.join(appDir('server-api'), '.env');
const workerEnvFile = path.join(appDir('worker'), '.env');
const frontendEnvFile = path.join(appDir('frontend'), '.env.development.local');
const simulatorEnvFile = path.join(appDir('image-simulator'), '.env');

// Secrets shared across processes are created once and reused so processes stay consistent.
const existingApi = readEnvFile(apiEnvFile);
const existingWorker = readEnvFile(workerEnvFile);
const existingSimulator = readEnvFile(simulatorEnvFile);
const dbPassword = (() => {
  const url = existingApi.get('DATABASE_URL');
  const match = url && /^postgresql:\/\/[^:]+:([^@]+)@/.exec(url);
  return rotate || !match ? randomSecret(18) : decodeURIComponent(match[1]);
})();
const workerSecret = rotate ? randomSecret() : (existingApi.get('WORKER_SERVICE_SECRET') ?? existingWorker.get('WORKER_SERVICE_SECRET') ?? randomSecret());
const simulatorKey = rotate
  ? `sim-local-${randomSecret(24)}`
  : (existingWorker.get('IMAGE_PROVIDER_API_KEY') ?? existingSimulator.get('SIMULATOR_API_KEY') ?? `sim-local-${randomSecret(24)}`);

const dbUrl = (name) => `postgresql://bobby:${encodeURIComponent(dbPassword)}@127.0.0.1:${PORTS.postgres}/${name}`;
const secretKeys = rotate ? ['WORKER_SERVICE_SECRET', 'ASSET_URL_SECRET', 'DATABASE_URL', 'SHADOW_DATABASE_URL'] : [];

const apiAdded = ensureEnvFile(
  apiEnvFile,
  {
    APP_ENV: 'development',
    NODE_ENV: 'development',
    PORT: String(PORTS.api),
    BASE_URL: `http://localhost:${PORTS.api}`,
    ALLOWED_CORS_DOMAINS: `http://localhost:${PORTS.frontend},http://127.0.0.1:${PORTS.frontend}`,
    DATABASE_URL: dbUrl('bobby_dev'),
    SHADOW_DATABASE_URL: dbUrl('bobby_dev_shadow'),
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: String(PORTS.redis),
    FIREBASE_PROJECT_ID: FIREBASE_DEMO_PROJECT,
    FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${PORTS.authEmulator}`,
    STORAGE_DRIVER: 'local',
    LOCAL_STORAGE_ROOT: assetsRoot,
    WORKER_SERVICE_SECRET: workerSecret,
    ASSET_URL_SECRET: () => randomSecret(),
    METRICS_TOKEN: () => randomSecret(),
    IMAGE_PROVIDER: 'openai',
    IMAGE_PROVIDER_MODE: 'simulated',
  },
  { forceKeys: secretKeys },
);
summary.push(['server-api/.env', apiAdded]);

const workerAdded = ensureEnvFile(
  workerEnvFile,
  {
    APP_ENV: 'development',
    NODE_ENV: 'development',
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: String(PORTS.redis),
    API_INTERNAL_URL: `http://127.0.0.1:${PORTS.api}/api`,
    WORKER_SERVICE_SECRET: workerSecret,
    WORKER_HEALTH_PORT: String(PORTS.workerHealth),
    WORKER_CONCURRENCY: '2',
    STORAGE_DRIVER: 'local',
    LOCAL_STORAGE_ROOT: assetsRoot,
    IMAGE_PROVIDER: 'openai',
    IMAGE_PROVIDER_MODE: 'simulated',
    IMAGE_PROVIDER_BASE_URL: `http://127.0.0.1:${PORTS.simulator}`,
    IMAGE_PROVIDER_API_KEY: simulatorKey,
    IMAGE_MODEL: 'simulated-openai-image',
  },
  { forceKeys: rotate ? ['WORKER_SERVICE_SECRET', 'IMAGE_PROVIDER_API_KEY'] : [] },
);
summary.push(['worker/.env', workerAdded]);

if (existsSync(appDir('image-simulator'))) {
  const simulatorAdded = ensureEnvFile(
    simulatorEnvFile,
    {
      SIMULATOR_PORT: String(PORTS.simulator),
      SIMULATOR_API_KEY: simulatorKey,
    },
    { forceKeys: rotate ? ['SIMULATOR_API_KEY'] : [] },
  );
  summary.push(['image-simulator/.env', simulatorAdded]);
}

const frontendAdded = ensureEnvFile(frontendEnvFile, {
  VITE_BOBBY_BE_API: `http://localhost:${PORTS.api}/api`,
  VITE_API_SOCKET_URL: `http://localhost:${PORTS.api}`,
  VITE_FIREBASE_PROJECT_ID: FIREBASE_DEMO_PROJECT,
  // The Auth Emulator does not validate this value; it only has to be non-empty for the web SDK.
  VITE_FIREBASE_API_KEY: 'demo-emulator-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: `${FIREBASE_DEMO_PROJECT}.firebaseapp.com`,
  VITE_FIREBASE_AUTH_EMULATOR_URL: `http://127.0.0.1:${PORTS.authEmulator}`,
});
summary.push(['frontend/.env.development.local', frontendAdded]);

for (const [file, added] of summary) {
  log(`${file}: ${added.length > 0 ? `added ${added.join(', ')}` : 'unchanged'}`);
}

if (args.has('--skip-db')) {
  log('\nDatabase provisioning skipped (--skip-db).');
  process.exit(0);
}

step('Database');
const apiEnv = readEnvFile(apiEnvFile);
const dbRole = 'bobby';
const quote = (value) => `'${value.replaceAll("'", "''")}'`;

function pgAdmin(sql) {
  const adminUrl = process.env.BOBBY_PG_ADMIN_URL;
  const candidates = [];
  if (adminUrl) candidates.push(['psql', [adminUrl]]);
  candidates.push(['psql', ['-h', '127.0.0.1', '-p', String(PORTS.postgres), '-U', 'postgres', '-w', '-d', 'postgres']]);
  if (process.getuid?.() === 0 && commandExists('su')) candidates.push(['su', ['postgres', '-c', 'psql -d postgres']]);
  let last = { status: 1, stderr: 'no PostgreSQL admin access found' };
  // The isolated Compose database contains psql even when the host does not.
  const composeArgs = ['compose', '-f', path.join(ROOT, 'docker-compose.dev.yml')];
  const composeEnv = { ...process.env, BOBBY_POSTGRES_PORT: String(PORTS.postgres) };
  const published = run('docker', [...composeArgs, 'port', 'postgres', '5432'], { env: composeEnv });
  if (!adminUrl && published.status === 0 && published.stdout.trim() === `127.0.0.1:${PORTS.postgres}`) {
    const result = run('docker', [...composeArgs, 'exec', '-T', 'postgres', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tA'], { input: sql, env: composeEnv });
    if (result.status === 0) return result;
    last = result;
  }
  for (const [command, base] of candidates) {
    const result =
      command === 'su'
        ? run('su', ['postgres', '-c', `psql -d postgres -v ON_ERROR_STOP=1 -tA`], { input: sql })
        : run(command, [...base, '-v', 'ON_ERROR_STOP=1', '-tA'], { input: sql });
    if (result.status === 0) return result;
    last = result;
  }
  return last;
}

const reachable = pgAdmin('SELECT 1;');
if (reachable.status !== 0) {
  log('PostgreSQL admin access unavailable; skipping provisioning.');
  log('Start PostgreSQL (docker compose -f docker-compose.dev.yml up -d postgres) or set BOBBY_PG_ADMIN_URL, then re-run setup.');
  process.exit(2);
}
const apiDbUrl = new URL(apiEnv.get('DATABASE_URL'));
const apiPassword = decodeURIComponent(apiDbUrl.password);
const roleSql = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = ${quote(dbRole)}) THEN
    CREATE ROLE ${dbRole} LOGIN CREATEDB PASSWORD ${quote(apiPassword)};
  ELSE
    ALTER ROLE ${dbRole} LOGIN CREATEDB PASSWORD ${quote(apiPassword)};
  END IF;
END $$;`;
if (pgAdmin(roleSql).status !== 0) fail('could not create or update the local database role');
for (const name of ['bobby_dev', 'bobby_dev_shadow']) {
  const exists = pgAdmin(`SELECT 1 FROM pg_database WHERE datname = ${quote(name)};`).stdout.trim() === '1';
  if (!exists && pgAdmin(`CREATE DATABASE ${name} OWNER ${dbRole};`).status !== 0) fail(`could not create database ${name}`);
}
log('role and databases ready: bobby_dev, bobby_dev_shadow');

const apiCwd = appDir('server-api');
const prisma = (prismaArgs) => run('yarn', ['-s', ...prismaArgs], { cwd: apiCwd, stdio: 'inherit' });
if (prisma(['prisma:generate']).status !== 0) fail('prisma generate failed');
if (prisma(['prisma:deploy']).status !== 0) fail('prisma migrate deploy failed');
log('migrations applied to bobby_dev');
if (prisma(['prisma:seed']).status !== 0) fail('seed failed');

log('\nSetup complete. Next: node scripts/doctor.mjs');
log(`Repository root: ${ROOT}`);
