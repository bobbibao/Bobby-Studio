#!/usr/bin/env node
// Reports the health of the local Bobby Studio environment without printing secrets.
//
//   node scripts/doctor.mjs [--json]
//
// Exit code 0 when every required check passes, 1 otherwise.
import { existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { APPS, PORTS, appDir, checkPort, commandExists, httpOk, log, nodeMajor, readEnvFile, run } from './lib/common.mjs';

const asJson = process.argv.includes('--json');
const results = [];
const record = (area, name, ok, detail = '', required = true) => results.push({ area, name, ok, detail, required });

// Toolchain
record('tools', 'node >= 20', nodeMajor() >= 20, process.versions.node);
const yarnVersion = commandExists('yarn') ? run('yarn', ['--version']).stdout?.trim() : undefined;
record('tools', 'yarn 1.x', yarnVersion?.startsWith('1.') ?? false, yarnVersion || 'missing');
for (const app of APPS) {
  record('tools', `${app} dependencies`, existsSync(path.join(appDir(app), 'node_modules')), 'node_modules');
}

// Environment files: names and permissions only.
const envChecks = [
  ['server-api/.env', ['APP_ENV', 'DATABASE_URL', 'REDIS_HOST', 'FIREBASE_PROJECT_ID', 'STORAGE_DRIVER', 'WORKER_SERVICE_SECRET', 'ASSET_URL_SECRET', 'IMAGE_PROVIDER', 'IMAGE_PROVIDER_MODE']],
  ['worker/.env', ['APP_ENV', 'REDIS_HOST', 'API_INTERNAL_URL', 'WORKER_SERVICE_SECRET', 'IMAGE_PROVIDER', 'IMAGE_PROVIDER_MODE', 'IMAGE_PROVIDER_BASE_URL', 'IMAGE_PROVIDER_API_KEY']],
  ['frontend/.env.development.local', ['VITE_BOBBY_BE_API', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_API_KEY']],
];
const envs = {};
for (const [file, keys] of envChecks) {
  const full = path.join(appDir(file.split('/')[0]), file.split('/')[1]);
  const values = readEnvFile(full);
  envs[file] = values;
  if (!existsSync(full)) {
    record('config', file, false, 'missing (run: node scripts/setup.mjs)');
    continue;
  }
  const missing = keys.filter((key) => !values.get(key));
  record('config', file, missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : 'required keys present');
  // Windows uses NTFS ACLs; a POSIX mode of 666 does not describe who can read the file.
  if (process.platform !== 'win32') {
    const mode = statSync(full).mode & 0o777;
    record('config', `${file} permissions`, (mode & 0o077) === 0, `mode ${mode.toString(8)}`, false);
  }
}

// Profile validation using the API's own compiled validator, so the doctor cannot drift from it.
const apiEnv = envs['server-api/.env'];
const validator = path.join(appDir('server-api'), 'dist/src/config/runtime-config.js');
if (apiEnv.size > 0 && existsSync(validator)) {
  const { loadRuntimeConfig } = createRequire(import.meta.url)(validator);
  try {
    loadRuntimeConfig(Object.fromEntries(apiEnv));
    record('config', 'API runtime profile', true, 'valid');
  } catch (error) {
    record('config', 'API runtime profile', false, error.problems ? error.problems.join('; ') : error.message);
  }
} else {
  record('config', 'API runtime profile', false, 'build the API first (yarn --cwd server-api build) to validate', false);
}

// External-call policy: development must not be able to reach a paid provider.
const workerEnv = envs['worker/.env'];
const local = (value) => /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(value ?? '');
record('policy', 'image provider is simulated', workerEnv.get('IMAGE_PROVIDER_MODE') === 'simulated', workerEnv.get('IMAGE_PROVIDER_MODE') ?? 'unset');
record('policy', 'provider endpoint is local', local(workerEnv.get('IMAGE_PROVIDER_BASE_URL')), 'host check only');
record('policy', 'provider key is a local simulator key', (workerEnv.get('IMAGE_PROVIDER_API_KEY') ?? '').startsWith('sim-local-'), 'prefix check only; never used to select a provider');
record('policy', 'Auth Emulator is local', /^(127\.0\.0\.1|localhost):\d+$/.test(apiEnv.get('FIREBASE_AUTH_EMULATOR_HOST') ?? ''), 'host check only');

// Live services
for (const [name, port] of [['postgres', PORTS.postgres], ['redis', PORTS.redis], ['auth emulator', PORTS.authEmulator]]) {
  record('services', name, await checkPort(port), `:${port}`);
}
const http = [
  ['image simulator', `http://127.0.0.1:${PORTS.simulator}/health`, existsSync(appDir('image-simulator'))],
  ['api readiness', `http://127.0.0.1:${PORTS.api}/api/health/ready`, true],
  ['worker readiness', `http://127.0.0.1:${PORTS.workerHealth}/health/ready`, true],
  ['frontend', `http://127.0.0.1:${PORTS.frontend}/`, true],
];
for (const [name, url, present] of http) {
  if (!present) {
    record('services', name, false, 'not implemented yet', false);
    continue;
  }
  const result = await httpOk(url);
  record('services', name, result.ok, result.ok ? `HTTP ${result.status}` : result.status ? `HTTP ${result.status}` : `unreachable (${result.error ?? 'no response'})`);
}

const failed = results.filter((r) => !r.ok && r.required);
if (asJson) {
  log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
} else {
  let area = '';
  for (const r of results) {
    if (r.area !== area) {
      area = r.area;
      log(`\n[${area}]`);
    }
    log(`  ${r.ok ? 'ok  ' : r.required ? 'FAIL' : 'warn'}  ${r.name}${r.detail ? ` - ${r.detail}` : ''}`);
  }
  log(`\n${failed.length === 0 ? 'Environment is healthy.' : `${failed.length} required check(s) failed.`}`);
}
process.exit(failed.length === 0 ? 0 : 1);
