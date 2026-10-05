import { Storage } from '@google-cloud/storage';
import { assertValidStorageKey, AssetStorage } from './asset-storage';

/**
 * Private GCS bucket through Application Default Credentials (no exported private keys). Objects are
 * never public: readers go through the API, which authorizes and streams or signs short-lived access.
 */
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

  async delete(key: string): Promise<void> {
    assertValidStorageKey(key);
    await this.bucket.file(key).delete({ ignoreNotFound: true });
  }

  async list(prefix: string): Promise<string[]> {
    const [files] = await this.bucket.getFiles({ prefix });
    return files.map((file) => file.name);
  }
}
