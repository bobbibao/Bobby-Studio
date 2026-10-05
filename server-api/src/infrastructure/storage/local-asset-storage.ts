import { mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises';
import * as path from 'path';
import { assertValidStorageKey, AssetStorage } from './asset-storage';

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

  async put(key: string, bytes: Buffer): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    // Write then rename-free overwrite: keys are content-stable per job, so a repeat write is idempotent.
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

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async list(prefix: string): Promise<string[]> {
    assertValidStorageKey(prefix.replace(/\/$/, '') || 'x');
    const base = path.resolve(this.root, prefix);
    if (!base.startsWith(this.root)) return [];
    const out: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else out.push(path.relative(this.root, full).split(path.sep).join('/'));
      }
    };
    await walk(base);
    return out;
  }
}
