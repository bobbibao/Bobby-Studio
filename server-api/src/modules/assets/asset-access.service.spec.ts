import { AssetAccessService } from './asset-access.service';
import { RuntimeConfig } from '../../config/runtime-config';

const service = (secret = 's'.repeat(32)) => new AssetAccessService({ assetUrlSecret: secret } as RuntimeConfig);

describe('AssetAccessService', () => {
  const now = Date.UTC(2026, 9, 5, 12, 0, 0);

  it('accepts a fresh token for the same subject', () => {
    const token = service().sign('asset-1', 60, now);
    expect(service().verify('asset-1', token, now + 30_000)).toBe(true);
  });

  it('rejects an expired token', () => {
    const token = service().sign('asset-1', 60, now);
    expect(service().verify('asset-1', token, now + 61_000)).toBe(false);
  });

  it('is bound to its subject and its signing secret', () => {
    const token = service().sign('asset-1', 60, now);
    expect(service().verify('asset-2', token, now)).toBe(false);
    expect(service('z'.repeat(32)).verify('asset-1', token, now)).toBe(false);
  });

  it('rejects tampered or malformed tokens', () => {
    const token = service().sign('asset-1', 60, now);
    const [expiry, signature] = token.split('.');
    expect(service().verify('asset-1', `${Number(expiry) + 3600}.${signature}`, now)).toBe(false);
    expect(service().verify('asset-1', `${expiry}.${signature}x`, now)).toBe(false);
    expect(service().verify('asset-1', 'garbage', now)).toBe(false);
    expect(service().verify('asset-1', undefined, now)).toBe(false);
  });
});
