import { Storage } from '@google-cloud/storage';
import { GcsAssetStorage } from '../src/infrastructure/storage/gcs-asset-storage';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { startFakeGcs } = require('../../tools/support/fake-gcs.cjs');

// Exercises the real @google-cloud/storage client over HTTP against a local fake of the JSON API.
// It proves adapter wiring and error mapping, not Google's service behavior.
describe('GcsAssetStorage against a local GCS API fake', () => {
  const BUCKET = 'bobby-private-test';
  let fake: { url: string; objects: Map<string, unknown>; requests: string[]; close: () => Promise<void> };
  let storage: GcsAssetStorage;

  beforeAll(async () => {
    fake = await startFakeGcs({ bucket: BUCKET });
    storage = new GcsAssetStorage(BUCKET, new Storage({ apiEndpoint: fake.url, projectId: 'demo-bobby-studio' }));
  });
  afterAll(() => fake.close());

  it('stores, reads back and reports existence of an object', async () => {
    const bytes = Buffer.from([137, 80, 78, 71, 0, 1, 2, 3, 255]);
    await storage.put('generated/job-1/0.png', bytes, 'image/png');
    expect(await storage.exists('generated/job-1/0.png')).toBe(true);
    expect((await storage.read('generated/job-1/0.png')).equals(bytes)).toBe(true);
  });

  it('reports a missing object as absent and fails to read it', async () => {
    expect(await storage.exists('generated/job-2/0.png')).toBe(false);
    await expect(storage.read('generated/job-2/0.png')).rejects.toBeDefined();
  });

  it('deletes idempotently and lists by prefix', async () => {
    await storage.put('inputs/u1/a.png', Buffer.from('a'), 'image/png');
    await storage.put('inputs/u1/b.png', Buffer.from('b'), 'image/png');
    await storage.put('inputs/u2/c.png', Buffer.from('c'), 'image/png');
    expect(await storage.list('inputs/u1/')).toEqual(['inputs/u1/a.png', 'inputs/u1/b.png']);
    await storage.delete('inputs/u1/a.png');
    await storage.delete('inputs/u1/a.png');
    expect(await storage.list('inputs/u1/')).toEqual(['inputs/u1/b.png']);
  });

  it('rejects traversal and malformed keys before any network call', async () => {
    const before = fake.requests.length;
    for (const key of ['../secret', 'a//b', '/abs', 'a/../b', '']) {
      await expect(storage.put(key, Buffer.from('x'), 'image/png')).rejects.toThrow('Invalid storage key');
      await expect(storage.read(key)).rejects.toThrow('Invalid storage key');
    }
    expect(fake.requests.length).toBe(before);
  });
});
