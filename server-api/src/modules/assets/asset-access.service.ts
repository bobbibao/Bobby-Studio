import { Inject, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { RUNTIME_CONFIG, RuntimeConfig } from '../../config/runtime-config';

const DEFAULT_TTL_SECONDS = 10 * 60;

/**
 * Short-lived signed access to a single asset (or legacy image) for places that cannot send an
 * Authorization header, such as <img src>. A token is bound to one subject and one expiry, and is
 * only ever minted inside an already authorized API response. It is access, not identity.
 */
@Injectable()
export class AssetAccessService {
  private readonly secret: string;

  constructor(@Inject(RUNTIME_CONFIG) config: RuntimeConfig) {
    this.secret = config.assetUrlSecret;
  }

  sign(subject: string, ttlSeconds = DEFAULT_TTL_SECONDS, now = Date.now()): string {
    const expiresAt = Math.floor(now / 1000) + ttlSeconds;
    return `${expiresAt}.${this.mac(subject, expiresAt)}`;
  }

  verify(subject: string, token: string | undefined, now = Date.now()): boolean {
    if (!token) return false;
    const [expiry, signature, ...rest] = token.split('.');
    const expiresAt = Number(expiry);
    if (rest.length > 0 || !signature || !Number.isInteger(expiresAt)) return false;
    if (expiresAt < Math.floor(now / 1000)) return false;
    const expected = Buffer.from(this.mac(subject, expiresAt));
    const presented = Buffer.from(signature);
    return presented.length === expected.length && timingSafeEqual(presented, expected);
  }

  private mac(subject: string, expiresAt: number): string {
    return createHmac('sha256', this.secret).update(`${subject}\n${expiresAt}`).digest('base64url');
  }
}
