export const ASSET_STORAGE = Symbol('ASSET_STORAGE');

/** Object keys are server-generated and validated; they never come from a client. */
const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/_.-]{0,400}$/;

export function assertValidStorageKey(key: string): void {
  if (!KEY_PATTERN.test(key) || key.includes('..') || key.includes('//')) {
    throw new Error('Invalid storage key');
  }
}

/** Private binary storage behind a port: a local directory in development/test, a private GCS bucket elsewhere. */
export interface AssetStorage {
  put(key: string, bytes: Buffer, mimeType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  /** Lists keys below a prefix (used by recovery and cleanup). */
  list(prefix: string): Promise<string[]>;
}
