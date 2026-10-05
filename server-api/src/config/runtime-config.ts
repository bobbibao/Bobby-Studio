/**
 * Validated runtime configuration for the Bobby Studio API.
 *
 * Every deployment profile (development, test, staging, production) is validated
 * once at startup. Problems are reported as field names and reasons, never as values,
 * so a misconfigured environment fails closed without leaking secrets.
 */

import { isAbsolute } from 'node:path';

export const APP_ENVS = ['development', 'test', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export const IMAGE_PROVIDERS = ['openai', 'gemini'] as const;
export type ImageProviderId = (typeof IMAGE_PROVIDERS)[number];

export const IMAGE_PROVIDER_MODES = ['simulated', 'live'] as const;
export type ImageProviderMode = (typeof IMAGE_PROVIDER_MODES)[number];

export type StorageDriver = 'local' | 'gcs';

export type FirebaseCredentialSource = 'emulator' | 'service-account' | 'application-default';

export interface RuntimeConfig {
  appEnv: AppEnv;
  isDeployed: boolean;
  port: number;
  publicApiUrl: string;
  corsOrigins: string[];
  databaseUrl: string;
  redis: { host: string; port: number; password?: string; db: number };
  firebase: {
    projectId: string;
    /** host:port of the official Firebase Authentication Emulator; development and test only. */
    authEmulatorHost?: string;
    credentialSource: FirebaseCredentialSource;
  };
  storage: { driver: StorageDriver; localRoot?: string; gcsBucket?: string };
  workerServiceSecret: string;
  /** Signs short-lived asset access URLs (HMAC); never reused for other purposes. */
  assetUrlSecret: string;
  imageProvider: { id: ImageProviderId; mode: ImageProviderMode };
}

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid configuration:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

type Env = Record<string, string | undefined>;

const PLACEHOLDER_PREFIXES = ['your_', 'changeme', 'replace_me'];

/** A value counts as set when it is non-empty and not an obvious template placeholder. */
export function isSet(value: string | undefined | null): value is string {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  return !PLACEHOLDER_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

const MIN_SECRET_LENGTH = 24;

function parsePort(name: string, raw: string | undefined, problems: string[], fallback?: number): number {
  if (!isSet(raw)) {
    if (fallback !== undefined) return fallback;
    problems.push(`${name} is required`);
    return 0;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    problems.push(`${name} must be an integer between 1 and 65535`);
    return 0;
  }
  return value;
}

function oneOf<T extends string>(
  name: string,
  raw: string | undefined,
  allowed: readonly T[],
  problems: string[],
  fallback?: T,
): T {
  const value = isSet(raw) ? raw.trim() : undefined;
  if (value === undefined) {
    if (fallback !== undefined) return fallback;
    problems.push(`${name} is required (one of: ${allowed.join(', ')})`);
    return allowed[0];
  }
  if (!(allowed as readonly string[]).includes(value)) {
    problems.push(`${name} must be one of: ${allowed.join(', ')}`);
    return allowed[0];
  }
  return value as T;
}

function hasServiceAccount(env: Env): boolean {
  return isSet(env.PRIVATE_KEY) && isSet(env.CLIENT_EMAIL) && isSet(env.PROJECT_ID);
}

export function loadRuntimeConfig(env: Env = process.env): RuntimeConfig {
  const problems: string[] = [];

  const appEnv = oneOf('APP_ENV', env.APP_ENV, APP_ENVS, problems);
  const isDeployed = appEnv === 'staging' || appEnv === 'production';

  const port = parsePort('PORT', env.PORT, problems, 3000);
  const publicApiUrl = (env.BASE_URL ?? `http://localhost:${port}`).replace(/\/+$/, '');
  const corsOrigins = (env.ALLOWED_CORS_DOMAINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (isDeployed && corsOrigins.length === 0) {
    problems.push('ALLOWED_CORS_DOMAINS must list the browser origins in staging and production');
  }
  if (isDeployed && corsOrigins.includes('*')) {
    problems.push('ALLOWED_CORS_DOMAINS must not contain a wildcard in staging and production');
  }

  if (!isSet(env.DATABASE_URL)) problems.push('DATABASE_URL is required');

  if (!isSet(env.REDIS_HOST)) problems.push('REDIS_HOST is required');
  const redisPort = parsePort('REDIS_PORT', env.REDIS_PORT, problems, 6379);
  const redisDb = Number(env.REDIS_DB ?? '0');
  if (!Number.isInteger(redisDb) || redisDb < 0) problems.push('REDIS_DB must be a non-negative integer');

  // Firebase: emulator for development/test, real credentials elsewhere. Never both.
  const emulatorHost = isSet(env.FIREBASE_AUTH_EMULATOR_HOST) ? env.FIREBASE_AUTH_EMULATOR_HOST!.trim() : undefined;
  const projectId = isSet(env.FIREBASE_PROJECT_ID)
    ? env.FIREBASE_PROJECT_ID!.trim()
    : isSet(env.PROJECT_ID)
      ? env.PROJECT_ID!.trim()
      : '';
  if (!projectId) problems.push('FIREBASE_PROJECT_ID is required');
  if (emulatorHost) {
    if (isDeployed) {
      problems.push('FIREBASE_AUTH_EMULATOR_HOST must not be set in staging or production');
    }
    if (/^[a-z]+:\/\//i.test(emulatorHost)) {
      problems.push('FIREBASE_AUTH_EMULATOR_HOST must be host:port without a URL scheme');
    }
    if (!isDeployed && !projectId.startsWith('demo-')) {
      problems.push('FIREBASE_PROJECT_ID must start with "demo-" when the Auth Emulator is used');
    }
  }
  let credentialSource: FirebaseCredentialSource;
  if (emulatorHost) {
    credentialSource = 'emulator';
  } else if (hasServiceAccount(env)) {
    credentialSource = 'service-account';
  } else {
    credentialSource = 'application-default';
    if (!isDeployed) {
      problems.push(
        'Set FIREBASE_AUTH_EMULATOR_HOST for local Firebase Authentication, or provide real Firebase credentials',
      );
    }
  }

  // Storage.
  const storageDriver = oneOf<StorageDriver>('STORAGE_DRIVER', env.STORAGE_DRIVER, ['local', 'gcs'], problems);
  if (storageDriver === 'local') {
    if (isDeployed) problems.push('STORAGE_DRIVER=local is only allowed in development and test');
    if (!isSet(env.LOCAL_STORAGE_ROOT)) {
      problems.push('LOCAL_STORAGE_ROOT is required when STORAGE_DRIVER=local');
    } else if (!isAbsolute(env.LOCAL_STORAGE_ROOT!)) {
      problems.push('LOCAL_STORAGE_ROOT must be an absolute path');
    }
  } else if (!isSet(env.BOBBY_GCS_BUCKET_NAME)) {
    problems.push('BOBBY_GCS_BUCKET_NAME is required when STORAGE_DRIVER=gcs');
  }

  // Worker service credential for claim and callback requests.
  const workerServiceSecret = env.WORKER_SERVICE_SECRET ?? '';
  if (!isSet(workerServiceSecret) || workerServiceSecret.length < MIN_SECRET_LENGTH) {
    problems.push(`WORKER_SERVICE_SECRET is required and must be at least ${MIN_SECRET_LENGTH} characters`);
  }

  const assetUrlSecret = env.ASSET_URL_SECRET ?? '';
  if (!isSet(assetUrlSecret) || assetUrlSecret.length < MIN_SECRET_LENGTH) {
    problems.push(`ASSET_URL_SECRET is required and must be at least ${MIN_SECRET_LENGTH} characters`);
  }

  // Provider profile. Live inference is always an explicit choice.
  const providerId = oneOf<ImageProviderId>('IMAGE_PROVIDER', env.IMAGE_PROVIDER, IMAGE_PROVIDERS, problems);
  const providerMode = oneOf<ImageProviderMode>(
    'IMAGE_PROVIDER_MODE',
    env.IMAGE_PROVIDER_MODE,
    IMAGE_PROVIDER_MODES,
    problems,
    'simulated',
  );
  if (appEnv === 'production' && providerMode === 'simulated') {
    problems.push('IMAGE_PROVIDER_MODE=simulated is not allowed in production');
  }

  if (problems.length > 0) throw new ConfigError(problems);

  return {
    appEnv,
    isDeployed,
    port,
    publicApiUrl,
    corsOrigins,
    databaseUrl: env.DATABASE_URL!,
    redis: {
      host: env.REDIS_HOST!,
      port: redisPort,
      password: isSet(env.REDIS_PASSWORD) ? env.REDIS_PASSWORD : undefined,
      db: redisDb,
    },
    firebase: { projectId, authEmulatorHost: emulatorHost, credentialSource },
    storage: {
      driver: storageDriver,
      localRoot: storageDriver === 'local' ? env.LOCAL_STORAGE_ROOT : undefined,
      gcsBucket: storageDriver === 'gcs' ? env.BOBBY_GCS_BUCKET_NAME : undefined,
    },
    workerServiceSecret,
    assetUrlSecret,
    imageProvider: { id: providerId, mode: providerMode },
  };
}

export const RUNTIME_CONFIG = Symbol('RUNTIME_CONFIG');
