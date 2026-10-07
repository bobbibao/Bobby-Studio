#!/usr/bin/env node
// Starts, stops and reports the local Bobby Studio stack.
//
//   node scripts/dev.mjs start [--build] [--only=api,worker]   start infrastructure + applications
//   node scripts/dev.mjs stop                                   stop everything this script started
//   node scripts/dev.mjs status                                 report process and health state
//
// Infrastructure that is already listening is reused and never stopped by this script.
// Backend applications run from their compiled output, like a deployment would.
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  DATA_DIR,
  PORTS,
  ROOT,
  appDir,
  checkPort,
  commandExists,
  httpOk,
  log,
  run,
  readEnvFile,
  waitFor,
} from './lib/common.mjs';

const simulatorPort = Number(process.env.SIMULATOR_PORT || readEnvFile(path.join(ROOT, 'image-simulator/.env')).get('SIMULATOR_PORT') || PORTS.simulator);

const apiPort = Number(process.env.PORT || readEnvFile(path.join(ROOT, 'server-api/.env')).get('PORT') || PORTS.api);
const workerPort = Number(process.env.WORKER_HEALTH_PORT || readEnvFile(path.join(ROOT, 'worker/.env')).get('WORKER_HEALTH_PORT') || PORTS.workerHealth);

const frontendPort = Number(process.env.DEV_FRONTEND_PORT || readEnvFile(path.join(ROOT, 'frontend/.env.development.local')).get('DEV_FRONTEND_PORT') || PORTS.frontend);

const [command = 'status', ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((arg) => arg.startsWith('--') && !arg.includes('=')));
const only = rest.find((arg) => arg.startsWith('--only='))?.slice(7).split(',');

const PID_DIR = path.join(DATA_DIR, 'pids');
const LOG_DIR = path.join(DATA_DIR, 'logs');
mkdirSync(PID_DIR, { recursive: true });
mkdirSync(LOG_DIR, { recursive: true });

const pidFile = (name) => path.join(PID_DIR, `${name}.pid`);
const managedFile = (name) => path.join(PID_DIR, `${name}.managed`);

function dockerAvailable() {
  return commandExists('docker') && run('docker', ['info'], { stdio: 'ignore' }).status === 0;
}

function pgClusterVersion() {
  const base = '/etc/postgresql';
  return existsSync(base) ? readdirSync(base).sort().at(-1) : undefined;
}

const infra = {
  postgres: {
    port: PORTS.postgres,
    async start() {
      if (dockerAvailable()) {
        const result = run('docker', ['compose', '-f', path.join(ROOT, 'docker-compose.dev.yml'), 'up', '-d', 'postgres'], { stdio: 'inherit', env: { ...process.env, BOBBY_POSTGRES_PORT: String(PORTS.postgres) } });
        if (result.status !== 0) throw new Error('PostgreSQL Compose startup failed');
        return 'docker';
      }
      const version = pgClusterVersion();
      if (version && commandExists('pg_ctlcluster')) {
        run('pg_ctlcluster', [version, 'main', 'start'], { stdio: 'inherit' });
        return 'native';
      }
      throw new Error('No Docker daemon or local PostgreSQL cluster available');
    },
    stop(how) {
      if (how === 'docker') run('docker', ['compose', '-f', path.join(ROOT, 'docker-compose.dev.yml'), 'stop', 'postgres'], { stdio: 'inherit' });
      if (how === 'native') run('pg_ctlcluster', [pgClusterVersion(), 'main', 'stop'], { stdio: 'inherit' });
    },
  },
  redis: {
    port: PORTS.redis,
    async start() {
      if (dockerAvailable()) {
        run('docker', ['compose', '-f', path.join(ROOT, 'docker-compose.dev.yml'), 'up', '-d', 'redis'], { stdio: 'inherit' });
        return 'docker';
      }
      if (!commandExists('redis-server')) throw new Error('redis-server is not installed and Docker is unavailable');
      const dir = path.join(DATA_DIR, 'redis');
      mkdirSync(dir, { recursive: true });
      // noeviction + AOF: queued jobs must never be silently evicted or lost on restart.
      run('redis-server', [
        '--daemonize', 'yes', '--port', String(PORTS.redis), '--bind', '127.0.0.1', '--dir', dir,
        '--appendonly', 'yes', '--maxmemory-policy', 'noeviction', '--pidfile', path.join(PID_DIR, 'redis-server.pid'),
      ]);
      return 'native';
    },
    stop(how) {
      if (how === 'docker') run('docker', ['compose', '-f', path.join(ROOT, 'docker-compose.dev.yml'), 'stop', 'redis'], { stdio: 'inherit' });
      if (how === 'native') run('redis-cli', ['-p', String(PORTS.redis), 'shutdown', 'nosave'], { stdio: 'ignore' });
    },
  },
};

const apps = [
  {
    name: 'auth-emulator',
    dir: 'tools',
    cmd: [process.execPath, 'node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:start', '--only', 'auth', '--project', 'demo-bobby-studio', '--config', 'firebase.json'],
    ready: () => httpOk(`http://127.0.0.1:${PORTS.authEmulator}/`),
  },
  {
    name: 'simulator',
    dir: 'image-simulator',
    cmd: [process.execPath, 'dist/main.js'],
    build: ['yarn', 'build'],
    ready: () => httpOk(`http://127.0.0.1:${simulatorPort}/health`),
  },
  {
    name: 'api',
    dir: 'server-api',
    cmd: [process.execPath, 'dist/src/main.js'],
    build: ['yarn', 'build'],
    ready: () => httpOk(`http://127.0.0.1:${apiPort}/api/health/ready`),
  },
  {
    name: 'worker',
    dir: 'worker',
    cmd: [process.execPath, 'dist/main.js'],
    build: ['yarn', 'build'],
    ready: () => httpOk(`http://127.0.0.1:${workerPort}/health/ready`),
  },
  {
    name: 'frontend',
    dir: 'frontend',
    cmd: [process.execPath, 'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'],
    ready: () => httpOk(`http://127.0.0.1:${frontendPort}/`),
  },
];

const selected = (name) => !only || only.includes(name);

function readPid(name) {
  try {
    return Number(readFileSync(pidFile(name), 'utf8'));
  } catch {
    return undefined;
  }
}

function alive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function startInfra() {
  for (const [name, service] of Object.entries(infra)) {
    if (!selected(name)) continue;
    if (await checkPort(service.port)) {
      log(`${name}: already listening on :${service.port} (reused)`);
      continue;
    }
    const how = await service.start();
    writeFileSync(managedFile(name), how);
    await waitFor(`${name} on :${service.port}`, () => checkPort(service.port), { timeoutMs: 60000 });
    log(`${name}: started (${how})`);
  }
}

async function startApp(app) {
  if (!selected(app.name)) return;
  const dir = appDir(app.dir);
  if (!existsSync(dir)) {
    log(`${app.name}: ${app.dir}/ not present yet (skipped)`);
    return;
  }
  if ((await app.ready()).ok) {
    log(`${app.name}: already healthy (reused)`);
    return;
  }
  const entrypoint = path.join(dir, app.cmd[1]);
  if (app.build && (flags.has('--build') || (!existsSync(entrypoint) && !existsSync(`${entrypoint}.js`)))) {
    log(`${app.name}: building (${app.build.join(' ')})`);
    const built = run(app.build[0], app.build.slice(1), { cwd: dir, stdio: 'inherit' });
    if (built.status !== 0) throw new Error(`${app.name}: build failed`);
  }
  const out = openSync(path.join(LOG_DIR, `${app.name}.log`), 'a');
  const child = spawn(app.cmd[0], app.cmd.slice(1), { cwd: dir, detached: true, windowsHide: true, stdio: ['ignore', out, out], env: process.env });
  await new Promise((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', (error) => reject(new Error(`${app.name}: could not start (${error.code ?? 'spawn error'})`)));
  }).finally(() => closeSync(out));
  child.unref();
  writeFileSync(pidFile(app.name), String(child.pid));
  // Cold CLI/module loading on Windows can exceed two minutes after a fresh install.
  await waitFor(`${app.name} readiness`, async () => (await app.ready()).ok && alive(child.pid), { timeoutMs: process.platform === 'win32' ? 300000 : 120000, intervalMs: 700 }).catch((error) => {
    throw new Error(`${error.message}. See .data/logs/${app.name}.log`);
  });
  log(`${app.name}: healthy (pid ${child.pid}, log .data/logs/${app.name}.log)`);
}

async function start() {
  await startInfra();
  for (const app of apps) await startApp(app);
  log('\nStack is up. Frontend: http://127.0.0.1:' + frontendPort);
}

async function stop() {
  for (const app of [...apps].reverse()) {
    if (!selected(app.name)) continue;
    const pid = readPid(app.name);
    if (!pid) continue;
    if (alive(pid)) {
      try {
        process.kill(-pid, 'SIGTERM');
      } catch {
        process.kill(pid, 'SIGTERM');
      }
      await waitFor(`${app.name} exit`, async () => !alive(pid), { timeoutMs: 15000 }).catch(() => {
        try {
          process.kill(-pid, 'SIGKILL');
        } catch {
          /* already gone */
        }
      });
      log(`${app.name}: stopped`);
    }
    rmSync(pidFile(app.name), { force: true });
  }
  for (const [name, service] of Object.entries(infra)) {
    if (!selected(name) || !existsSync(managedFile(name))) continue;
    service.stop(readFileSync(managedFile(name), 'utf8'));
    rmSync(managedFile(name), { force: true });
    log(`${name}: stopped`);
  }
}

async function status() {
  for (const [name, service] of Object.entries(infra)) {
    const up = await checkPort(service.port);
    log(`${name.padEnd(14)} ${up ? 'listening' : 'down'} :${service.port}${existsSync(managedFile(name)) ? ' (started by dev.mjs)' : ''}`);
  }
  for (const app of apps) {
    if (!existsSync(appDir(app.dir))) {
      log(`${app.name.padEnd(14)} not present`);
      continue;
    }
    const health = await app.ready();
    log(`${app.name.padEnd(14)} ${health.ok ? 'healthy' : `unhealthy${health.status ? ` (HTTP ${health.status})` : ''}`}`);
  }
}

const handlers = { start, stop, status };
if (!handlers[command]) {
  log('Usage: node scripts/dev.mjs <start|stop|status> [--build] [--only=a,b]');
  process.exit(1);
}
handlers[command]().catch((error) => {
  log(`\n${error.message}`);
  process.exit(1);
});
