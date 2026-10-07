import { ConfigError, loadRuntimeConfig } from './runtime-config';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const devEnv = {
  APP_ENV: 'development',
  DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db',
  REDIS_HOST: '127.0.0.1',
  FIREBASE_PROJECT_ID: 'demo-bobby-studio',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  STORAGE_DRIVER: 'local',
  LOCAL_STORAGE_ROOT: '/var/lib/bobby/assets',
  WORKER_SERVICE_SECRET: 'x'.repeat(32),
  ASSET_URL_SECRET: 'y'.repeat(32),
  IMAGE_PROVIDER: 'openai',
  IMAGE_PROVIDER_MODE: 'simulated',
};

const productionEnv = {
  ...devEnv,
  APP_ENV: 'production',
  FIREBASE_PROJECT_ID: 'bobby-prod',
  FIREBASE_AUTH_EMULATOR_HOST: undefined,
  PROJECT_ID: 'bobby-prod',
  STORAGE_DRIVER: 'gcs',
  BOBBY_GCS_BUCKET_NAME: 'bobby-assets',
  ALLOWED_CORS_DOMAINS: 'https://studio.example.com',
  IMAGE_PROVIDER_MODE: 'live',
};

const problemsFor = (env: Record<string, string | undefined>): string[] => {
  try {
    loadRuntimeConfig(env);
  } catch (error) {
    if (error instanceof ConfigError) return error.problems;
    throw error;
  }
  return [];
};

describe('loadRuntimeConfig', () => {
  it('accepts an absolute storage path on the host platform and rejects a relative one', () => {
    const root = resolve(tmpdir(), 'bobby-assets');
    expect(loadRuntimeConfig({ ...devEnv, LOCAL_STORAGE_ROOT: root }).storage.localRoot).toBe(root);
    expect(problemsFor({ ...devEnv, LOCAL_STORAGE_ROOT: '.data/assets' })).toContain('LOCAL_STORAGE_ROOT must be an absolute path');
  });

  it('accepts the local development profile with the Auth Emulator', () => {
    const config = loadRuntimeConfig(devEnv);
    expect(config.firebase.credentialSource).toBe('emulator');
    expect(config.imageProvider).toEqual({ id: 'openai', mode: 'simulated' });
  });

  it.each([
    ['production', { ...productionEnv, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' }],
    ['staging', { ...productionEnv, APP_ENV: 'staging', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' }],
  ])('rejects Auth Emulator settings in %s', (_name, env) => {
    expect(problemsFor(env).join('\n')).toContain('FIREBASE_AUTH_EMULATOR_HOST must not be set');
  });

  it('rejects the simulated provider and local storage in production', () => {
    const problems = problemsFor({ ...productionEnv, IMAGE_PROVIDER_MODE: 'simulated', STORAGE_DRIVER: 'local' }).join('\n');
    expect(problems).toContain('IMAGE_PROVIDER_MODE=simulated is not allowed in production');
    expect(problems).toContain('STORAGE_DRIVER=local is only allowed in development and test');
  });

  it('does not infer anything from a missing APP_ENV', () => {
    expect(problemsFor({ ...devEnv, APP_ENV: undefined }).join('\n')).toContain('APP_ENV is required');
  });

  it('requires an explicit emulator or real credentials outside deployments', () => {
    expect(problemsFor({ ...devEnv, FIREBASE_AUTH_EMULATOR_HOST: undefined }).join('\n')).toContain(
      'Set FIREBASE_AUTH_EMULATOR_HOST',
    );
  });

  it('reports field names without echoing secret values', () => {
    const secret = 'super-secret-value-that-must-not-leak';
    const message = problemsFor({ ...devEnv, WORKER_SERVICE_SECRET: 'short', DATABASE_URL: secret, REDIS_HOST: undefined }).join('\n');
    expect(message).toContain('WORKER_SERVICE_SECRET');
    expect(message).not.toContain(secret);
  });

  it('accepts a complete production profile with live provider and Application Default Credentials', () => {
    const config = loadRuntimeConfig(productionEnv);
    expect(config.firebase.credentialSource).toBe('application-default');
    expect(config.isDeployed).toBe(true);
  });
});
