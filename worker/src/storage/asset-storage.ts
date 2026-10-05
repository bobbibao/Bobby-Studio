import { Storage } from '@google-cloud/storage';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import * as path from 'path';

/** Keys are produced by the worker and the API; both validate them before any storage access. */
const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/_.-]{0,400}$/;

export function assertValidStorageKey(key: string): void {
  if (!KEY_PATTERN.test(key) || key.includes('..') || key.includes('//')) throw new Error('Invalid storage key');
}

/** The same private-storage port as the API, so a result written here is readable there. */
export interface AssetStorage {
  put(key: string, bytes: Buffer, mimeType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
}

export class LocalAssetStorage implements AssetStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string {
    assertValidStorageKey(key);
    const target = path.resolve(this.root, key);
    if (!target.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    return target;
  }

  async put(key: string, bytes: Buffer, _mimeType?: string): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }

  read(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await stat(this.resolve(key))).isFile();
    } catch {
      return false;
    }
  }
}

export class GcsAssetStorage implements AssetStorage {
  private readonly bucket;

  constructor(bucketName: string, storage = new Storage()) {
    this.bucket = storage.bucket(bucketName);
  }

  async put(key: string, bytes: Buffer, mimeType: string): Promise<void> {
    assertValidStorageKey(key);
    await this.bucket.file(key).save(bytes, { contentType: mimeType, resumable: false });
  }

  async read(key: string): Promise<Buffer> {
    assertValidStorageKey(key);
    const [contents] = await this.bucket.file(key).download();
    return contents;
  }

  async exists(key: string): Promise<boolean> {
    assertValidStorageKey(key);
    const [exists] = await this.bucket.file(key).exists();
    return exists;
  }
}
