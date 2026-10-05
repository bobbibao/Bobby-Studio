import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Runs the real image simulator (compiled output) as a child process on an ephemeral port.
 * Build it first: `yarn --cwd image-simulator build`.
 */
export interface SimulatorProcess {
  baseUrl: string;
  apiKey: string;
  scenario(scenario: string, options?: { times?: number; then?: string }): Promise<void>;
  reset(): Promise<void>;
  requests(): Promise<{ received: number; byRoute: Record<string, number> }>;
  stop(): Promise<void>;
}

const SIMULATOR_DIR = resolve(__dirname, '../../../../image-simulator');

export async function startSimulatorProcess(apiKey = 'sim-local-worker-spec-key-0123456789'): Promise<SimulatorProcess> {
  const entry = join(SIMULATOR_DIR, 'dist', 'main.js');
  if (!existsSync(entry)) throw new Error('image-simulator is not built. Run: yarn --cwd image-simulator build');

  const child: ChildProcess = spawn(process.execPath, [entry], {
    cwd: SIMULATOR_DIR,
    env: { ...process.env, SIMULATOR_API_KEY: apiKey, SIMULATOR_PORT: '0', SIMULATOR_LATENCY_MS: '0', SIMULATOR_HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const baseUrl = await new Promise<string>((resolveUrl, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('simulator did not start in time')), 15_000);
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      const match = /listening on (http:\/\/127\.0\.0\.1:\d+)/.exec(output);
      if (match) {
        clearTimeout(timer);
        resolveUrl(match[1]);
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`simulator exited early (code ${code}): ${output.trim()}`));
    });
  });

  const headers = { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' };
  const call = async (path: string, method: string, body?: unknown): Promise<Response> => {
    const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) throw new Error(`simulator control ${path} failed with ${response.status}`);
    return response;
  };

  return {
    baseUrl,
    apiKey,
    async scenario(scenario, options = {}) {
      await call('/__sim/scenario', 'POST', { scenario, ...options });
    },
    async reset() {
      await call('/__sim/reset', 'POST', {});
    },
    async requests() {
      return (await call('/__sim/requests', 'GET')).json() as Promise<{ received: number; byRoute: Record<string, number> }>;
    },
    stop: () =>
      new Promise<void>((resolveStop) => {
        if (child.exitCode !== null) return resolveStop();
        child.removeAllListeners('exit');
        child.once('exit', () => resolveStop());
        child.kill('SIGTERM');
      }),
  };
}
