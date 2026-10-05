import { Storage } from '@google-cloud/storage';
import { GcsAssetStorage } from './asset-storage';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { startFakeGcs } = require('../../../tools/support/fake-gcs.cjs');

// The real @google-cloud/storage client over HTTP against a local fake of the JSON API. Proves adapter
// wiring and key validation, not Google's service behavior.
describe('worker GcsAssetStorage against a local GCS API fake', () => {
  const BUCKET = 'bobby-private-test';
  let fake: { url: string; objects: Map<string, { bytes: Buffer }>; requests: string[]; close: () => Promise<void> };
  let storage: GcsAssetStorage;

  beforeAll(async () => {
    fake = await startFakeGcs({ bucket: BUCKET });
    storage = new GcsAssetStorage(BUCKET, new Storage({ apiEndpoint: fake.url, projectId: 'demo-bobby-studio' }));
  });
  afterAll(() => fake.close());

  it('writes deterministic result keys that read back byte for byte', async () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 255]);
    await storage.put('generated/job-9/0.png', png, 'image/png');
    expect(await storage.exists('generated/job-9/0.png')).toBe(true);
    expect((await storage.read('generated/job-9/0.png')).equals(png)).toBe(true);
    // Recovery after a crash relies on a repeated put being harmless.
    await storage.put('generated/job-9/0.png', png, 'image/png');
    expect(fake.objects.get('generated/job-9/0.png')?.bytes.equals(png)).toBe(true);
  });

  it('treats a missing result as absent', async () => {
    expect(await storage.exists('generated/job-404/0.png')).toBe(false);
  });

  it('refuses unsafe keys without touching the network', async () => {
    const before = fake.requests.length;
    await expect(storage.put('../escape', Buffer.from('x'), 'image/png')).rejects.toThrow('Invalid storage key');
    await expect(storage.exists('a//b')).rejects.toThrow('Invalid storage key');
    expect(fake.requests.length).toBe(before);
  });
});
