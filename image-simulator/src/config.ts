import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SimulatorConfig {
  host: string;
  port: number;
  apiKey: string;
  defaultLatencyMs: number;
  maxLatencyMs: number;
  maxBodyBytes: number;
  maxInputImageBytes: number;
  maxInputPixels: number;
  /** How long a `timeout` scenario holds a connection before giving up (bounds leaked sockets). */
  timeoutHoldMs: number;
}

export const LIMITS = {
  maxBodyBytes: 16 * 1024 * 1024,
  maxInputImageBytes: 10 * 1024 * 1024,
  maxInputPixels: 16_000_000,
  maxLatencyMs: 30_000,
  timeoutHoldMs: 120_000,
} as const;

type Env = Record<string, string | undefined>;

/** Parses KEY=VALUE lines. No interpolation or export syntax; values may be quoted. */
export function parseEnvFile(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || line.trimStart().startsWith('#')) continue;
    let value = match[2];
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

/** Reads `.env` from the simulator directory; real process environment variables take precedence. */
export function readEnv(dir: string, processEnv: Env = process.env): Env {
  const file = join(dir, '.env');
  const fromFile = existsSync(file) ? parseEnvFile(readFileSync(file, 'utf8')) : {};
  return { ...fromFile, ...Object.fromEntries(Object.entries(processEnv).filter(([, v]) => v !== undefined && v !== '')) };
}

function intInRange(name: string, raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

export function loadConfig(env: Env): SimulatorConfig {
  const apiKey = (env.SIMULATOR_API_KEY ?? '').trim();
  if (apiKey.length < 16) {
    throw new Error('SIMULATOR_API_KEY is required and must be at least 16 characters (use a local key such as sim-local-...)');
  }
  return {
    host: (env.SIMULATOR_HOST ?? '127.0.0.1').trim() || '127.0.0.1',
    port: intInRange('SIMULATOR_PORT', env.SIMULATOR_PORT, 4010, 0, 65535),
    apiKey,
    defaultLatencyMs: intInRange('SIMULATOR_LATENCY_MS', env.SIMULATOR_LATENCY_MS, 800, 0, LIMITS.maxLatencyMs),
    maxLatencyMs: LIMITS.maxLatencyMs,
    maxBodyBytes: LIMITS.maxBodyBytes,
    maxInputImageBytes: LIMITS.maxInputImageBytes,
    maxInputPixels: LIMITS.maxInputPixels,
    timeoutHoldMs: LIMITS.timeoutHoldMs,
  };
}
