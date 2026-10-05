#!/usr/bin/env node
// Selects the image provider profile (provider, mode, base URL, model) and its secret together.
//
//   node scripts/configure-provider.mjs --provider openai --mode live --model <vendor-model-id> [--base-url https://...]
//   node scripts/configure-provider.mjs --provider gemini --mode live --model <vendor-model-id>
//   node scripts/configure-provider.mjs --rotate-key                 # same live profile, new secret only
//   node scripts/configure-provider.mjs --provider openai --mode simulated
//
// The secret is read from a masked prompt, --secret-env <VARIABLE> or --secret-file <path>, never from a
// command-line argument. The result is validated with the application's own config validators before any file
// is changed; on any failure the previous env files stay untouched. This command makes NO provider request:
// run scripts/provider-smoke.mjs separately (live smoke is explicit and budget-gated).
import { chmodSync, copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import readline from 'node:readline';
import { PORTS, appDir, log, readEnvFile } from './lib/common.mjs';

const argv = process.argv.slice(2);
const flag = (name) => (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : undefined);
const has = (name) => argv.includes(`--${name}`);

const LIVE_BASE = { openai: 'https://api.openai.com', gemini: 'https://generativelanguage.googleapis.com' };
const SIM_MODEL = { openai: 'simulated-openai-image', gemini: 'simulated-gemini-image' };

const apiEnvFile = path.join(appDir('server-api'), '.env');
const workerEnvFile = path.join(appDir('worker'), '.env');
const simulatorEnvFile = path.join(appDir('image-simulator'), '.env');
const apiEnv = readEnvFile(apiEnvFile);
const workerEnv = readEnvFile(workerEnvFile);

function fail(message) {
  log(`\nNot changed: ${message}`);
  process.exit(1);
}

async function readSecret() {
  if (flag('secret-env')) {
    const value = process.env[flag('secret-env')];
    if (!value) fail(`environment variable ${flag('secret-env')} is empty`);
    return value;
  }
  if (flag('secret-file')) return readFileSync(flag('secret-file'), 'utf8').trim();
  if (!process.stdin.isTTY) fail('no TTY for a masked prompt; use --secret-env or --secret-file');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = (text) => (text.includes('\n') || text.startsWith('API key')) ? process.stdout.write(text) : process.stdout.write('*');
  return new Promise((resolve) => rl.question('API key (input hidden): ', (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer.trim()); }));
}

const rotate = has('rotate-key');
const provider = rotate ? workerEnv.get('IMAGE_PROVIDER') : (flag('provider') ?? fail('--provider openai|gemini is required'));
const mode = rotate ? workerEnv.get('IMAGE_PROVIDER_MODE') : (flag('mode') ?? fail('--mode live|simulated is required'));
if (!['openai', 'gemini'].includes(provider)) fail('provider must be openai or gemini');
if (!['live', 'simulated'].includes(mode)) fail('mode must be live or simulated');
if (rotate && mode !== 'live') fail('--rotate-key only applies to an established live profile');
if (rotate && (flag('provider') || flag('mode') || flag('model') || flag('base-url'))) fail('--rotate-key changes only the secret; do not pass profile options');

let baseUrl;
let model;
let secret;
if (mode === 'simulated') {
  baseUrl = `http://127.0.0.1:${PORTS.simulator}`;
  model = SIM_MODEL[provider];
  secret = readEnvFile(simulatorEnvFile).get('SIMULATOR_API_KEY') ?? fail('image-simulator/.env has no SIMULATOR_API_KEY (run node scripts/setup.mjs)');
} else {
  baseUrl = rotate ? workerEnv.get('IMAGE_PROVIDER_BASE_URL') : (flag('base-url') ?? LIVE_BASE[provider]);
  model = rotate ? workerEnv.get('IMAGE_MODEL') : (flag('model') ?? fail('--model <vendor model id> is required for a live profile'));
  secret = await readSecret();
  if (!secret || secret.length < 8) fail('the secret looks empty or too short');
  if (secret.startsWith('sim-local-')) fail('a local simulator key cannot be used for a live profile');
}

// Validate with the application's own validators (compiled output), using the would-be environment.
const proposedWorker = { ...Object.fromEntries(workerEnv), IMAGE_PROVIDER: provider, IMAGE_PROVIDER_MODE: mode, IMAGE_PROVIDER_BASE_URL: baseUrl, IMAGE_PROVIDER_API_KEY: secret, IMAGE_MODEL: model };
const proposedApi = { ...Object.fromEntries(apiEnv), IMAGE_PROVIDER: provider, IMAGE_PROVIDER_MODE: mode };
const require = createRequire(import.meta.url);
const validators = [
  [path.join(appDir('worker'), 'dist/config/worker-config.js'), 'loadWorkerConfig', proposedWorker, 'worker'],
  [path.join(appDir('server-api'), 'dist/src/config/runtime-config.js'), 'loadRuntimeConfig', proposedApi, 'API'],
];
for (const [file, fn, env, name] of validators) {
  if (!existsSync(file)) fail(`${name} is not built; build it first so its validator can run`);
  try {
    require(file)[fn](env);
  } catch (error) {
    fail(`${name} configuration would be invalid:\n  - ${(error.problems ?? [error.message]).join('\n  - ')}`);
  }
}

function writeEnv(file, updates) {
  const current = readEnvFile(file);
  for (const [key, value] of Object.entries(updates)) current.set(key, value);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  copyFileSync(file, `${file}.bak-${stamp}`);
  chmodSync(`${file}.bak-${stamp}`, 0o600);
  const body = [...current.entries()].map(([k, v]) => `${k}=${/[\s#"']/.test(v) ? JSON.stringify(v) : v}`).join('\n');
  writeFileSync(`${file}.tmp`, `${body}\n`, { mode: 0o600 });
  renameSync(`${file}.tmp`, file);
}

writeEnv(workerEnvFile, { IMAGE_PROVIDER: provider, IMAGE_PROVIDER_MODE: mode, IMAGE_PROVIDER_BASE_URL: baseUrl, IMAGE_PROVIDER_API_KEY: secret, IMAGE_MODEL: model });
writeEnv(apiEnvFile, { IMAGE_PROVIDER: provider, IMAGE_PROVIDER_MODE: mode });

log(`\nProfile written: provider=${provider} mode=${mode} model=${model} endpoint=${new URL(baseUrl).host}`);
log(`Secret: ${rotate ? 'rotated' : 'set'} (${secret.length} characters, not displayed). Previous files kept as *.bak-<timestamp>.`);
log('No provider request was made. Restart the API and worker to apply the profile.');
if (mode === 'live') log('Verify with a deliberate, budgeted call: node scripts/provider-smoke.mjs --confirm-spend');
