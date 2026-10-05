import type { AddressInfo } from 'node:net';
import sharp from 'sharp';
import { loadConfig } from '../src/config';
import { createSimulatorServer } from '../src/server';

export const KEY = 'sim-local-test-key-0123456789';

export interface RunningSimulator {
  baseUrl: string;
  close(): Promise<void>;
}

export async function startSimulator(env: Record<string, string> = {}): Promise<RunningSimulator> {
  const config = loadConfig({ SIMULATOR_API_KEY: KEY, SIMULATOR_PORT: '0', SIMULATOR_LATENCY_MS: '0', ...env });
  const { server } = createSimulatorServer(config);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}

export async function solidImage(width: number, height: number, color: string, format: 'png' | 'jpeg' = 'png'): Promise<Buffer> {
  const base = sharp({ create: { width, height, channels: 3, background: color } });
  return format === 'png' ? base.png().toBuffer() : base.jpeg().toBuffer();
}

export async function dimensions(bytes: Uint8Array): Promise<{ width?: number; height?: number; format?: string }> {
  const meta = await sharp(bytes).metadata();
  // Decode fully so truncated or corrupt data fails here.
  await sharp(bytes).raw().toBuffer();
  return { width: meta.width, height: meta.height, format: meta.format };
}

export const bearer = (key = KEY) => ({ authorization: `Bearer ${key}` });
export const control = (path: string, body: unknown, key = KEY) =>
  fetch(path, { method: 'POST', headers: { ...bearer(key), 'content-type': 'application/json' }, body: JSON.stringify(body) });
