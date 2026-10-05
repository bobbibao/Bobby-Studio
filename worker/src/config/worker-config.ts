/**
 * Validated runtime configuration for the Bobby Studio worker.
 * Problems are reported as field names and reasons, never as values.
 */
export const APP_ENVS = ['development', 'test', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];
export type ImageProviderId = 'openai' | 'gemini';
export type ImageProviderMode = 'simulated' | 'live';

export interface WorkerRuntimeConfig {
  appEnv: AppEnv;
  isDeployed: boolean;
  redis: { host: string; port: number; password?: string; db: number };
  apiInternalUrl: string;
  workerServiceSecret: string;
  healthPort: number;
  healthHost: string;
  concurrency: number;
  storage: { driver: 'local' | 'gcs'; localRoot?: string };
  imageProvider: {
    id: ImageProviderId;
    mode: ImageProviderMode;
    baseUrl: string;
    apiKey: string;
    model: string;
  };
}

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid worker configuration:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

type Env = Record<string, string | undefined>;

const PLACEHOLDER_PREFIXES = ['your_', 'changeme', 'replace_me'];
const MIN_SECRET_LENGTH = 24;

const isSet = (value: string | undefined | null): value is string => {
  if (!value || !value.trim()) return false;
  const lower = value.trim().toLowerCase();
  return !PLACEHOLDER_PREFIXES.some((prefix) => lower.startsWith(prefix));
};

const isLocalUrl = (value: string): boolean => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/.test(value);

function oneOf<T extends string>(name: string, raw: string | undefined, allowed: readonly T[], problems: string[]): T {
  if (!isSet(raw)) {
    problems.push(`${name} is required (one of: ${allowed.join(', ')})`);
    return allowed[0];
  }
  if (!(allowed as readonly string[]).includes(raw.trim())) {
    problems.push(`${name} must be one of: ${allowed.join(', ')}`);
    return allowed[0];
  }
  return raw.trim() as T;
}

function integer(name: string, raw: string | undefined, fallback: number, min: number, max: number, problems: string[]): number {
  if (!isSet(raw)) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    problems.push(`${name} must be an integer between ${min} and ${max}`);
    return fallback;
  }
  return value;
}

export function loadWorkerConfig(env: Env = process.env): WorkerRuntimeConfig {
  const problems: string[] = [];
  const appEnv = oneOf('APP_ENV', env.APP_ENV, APP_ENVS, problems);
  const isDeployed = appEnv === 'staging' || appEnv === 'production';

  if (!isSet(env.REDIS_HOST)) problems.push('REDIS_HOST is required');
  const redisPort = integer('REDIS_PORT', env.REDIS_PORT, 6379, 1, 65535, problems);
  const redisDb = integer('REDIS_DB', env.REDIS_DB, 0, 0, 15, problems);

  if (!isSet(env.API_INTERNAL_URL)) problems.push('API_INTERNAL_URL is required');
  if (!isSet(env.WORKER_SERVICE_SECRET) || env.WORKER_SERVICE_SECRET.length < MIN_SECRET_LENGTH) {
    problems.push(`WORKER_SERVICE_SECRET is required and must be at least ${MIN_SECRET_LENGTH} characters`);
  }

  const storageDriver = oneOf<'local' | 'gcs'>('STORAGE_DRIVER', env.STORAGE_DRIVER, ['local', 'gcs'], problems);
  if (storageDriver === 'local') {
    if (isDeployed) problems.push('STORAGE_DRIVER=local is only allowed in development and test');
    if (!isSet(env.LOCAL_STORAGE_ROOT) || !env.LOCAL_STORAGE_ROOT.startsWith('/')) {
      problems.push('LOCAL_STORAGE_ROOT must be an absolute path when STORAGE_DRIVER=local');
    }
  } else if (!isSet(env.BOBBY_GCS_BUCKET_NAME)) {
    problems.push('BOBBY_GCS_BUCKET_NAME is required when STORAGE_DRIVER=gcs');
  }

  const providerId = oneOf<ImageProviderId>('IMAGE_PROVIDER', env.IMAGE_PROVIDER, ['openai', 'gemini'], problems);
  const providerMode = oneOf<ImageProviderMode>('IMAGE_PROVIDER_MODE', env.IMAGE_PROVIDER_MODE, ['simulated', 'live'], problems);
  const baseUrl = (env.IMAGE_PROVIDER_BASE_URL ?? '').trim().replace(/\/+$/, '');
  if (!isSet(baseUrl)) {
    problems.push('IMAGE_PROVIDER_BASE_URL is required');
  } else if (providerMode === 'simulated' && !isLocalUrl(baseUrl)) {
    // A simulated profile must never be able to reach an external, possibly paid, endpoint.
    problems.push('IMAGE_PROVIDER_BASE_URL must be a loopback address when IMAGE_PROVIDER_MODE=simulated');
  } else if (providerMode === 'live' && !/^https:\/\//.test(baseUrl)) {
    problems.push('IMAGE_PROVIDER_BASE_URL must use https when IMAGE_PROVIDER_MODE=live');
  }
  if (!isSet(env.IMAGE_PROVIDER_API_KEY)) problems.push('IMAGE_PROVIDER_API_KEY is required');
  if (!isSet(env.IMAGE_MODEL)) problems.push('IMAGE_MODEL is required');
  if (appEnv === 'production' && providerMode === 'simulated') {
    problems.push('IMAGE_PROVIDER_MODE=simulated is not allowed in production');
  }

  if (problems.length > 0) throw new ConfigError(problems);

  return {
    appEnv,
    isDeployed,
    redis: { host: env.REDIS_HOST!, port: redisPort, password: isSet(env.REDIS_PASSWORD) ? env.REDIS_PASSWORD : undefined, db: redisDb },
    apiInternalUrl: env.API_INTERNAL_URL!.replace(/\/+$/, ''),
    workerServiceSecret: env.WORKER_SERVICE_SECRET!,
    healthPort: integer('WORKER_HEALTH_PORT', env.WORKER_HEALTH_PORT, 3100, 1, 65535, problems),
    healthHost: isSet(env.WORKER_HEALTH_HOST) ? env.WORKER_HEALTH_HOST : '127.0.0.1',
    concurrency: integer('WORKER_CONCURRENCY', env.WORKER_CONCURRENCY, 2, 1, 32, problems),
    storage: { driver: storageDriver, localRoot: storageDriver === 'local' ? env.LOCAL_STORAGE_ROOT : undefined },
    imageProvider: { id: providerId, mode: providerMode, baseUrl, apiKey: env.IMAGE_PROVIDER_API_KEY!, model: env.IMAGE_MODEL! },
  };
}
