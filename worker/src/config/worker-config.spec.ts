import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { loadWorkerConfig } from './worker-config';

const devEnv = {
  APP_ENV: 'development',
  REDIS_HOST: '127.0.0.1',
  API_INTERNAL_URL: 'http://127.0.0.1:3000/api',
  WORKER_SERVICE_SECRET: 'x'.repeat(32),
  STORAGE_DRIVER: 'local',
  LOCAL_STORAGE_ROOT: resolve(tmpdir(), 'bobby-assets'),
  IMAGE_PROVIDER: 'openai',
  IMAGE_PROVIDER_MODE: 'simulated',
  IMAGE_PROVIDER_BASE_URL: 'http://127.0.0.1:4010',
  IMAGE_PROVIDER_API_KEY: 'sim-local-test-key',
  IMAGE_MODEL: 'simulated-openai-image',
};

describe('worker storage configuration', () => {
  it('accepts an absolute storage path on the host platform', () => {
    expect(loadWorkerConfig(devEnv).storage.localRoot).toBe(devEnv.LOCAL_STORAGE_ROOT);
  });

  it('rejects relative storage paths', () => {
    expect(() => loadWorkerConfig({ ...devEnv, LOCAL_STORAGE_ROOT: '.data/assets' })).toThrow(
      'LOCAL_STORAGE_ROOT must be an absolute path',
    );
  });

  it('keeps local storage forbidden in production', () => {
    expect(() => loadWorkerConfig({ ...devEnv, APP_ENV: 'production' })).toThrow(
      'STORAGE_DRIVER=local is only allowed in development and test',
    );
  });
});
