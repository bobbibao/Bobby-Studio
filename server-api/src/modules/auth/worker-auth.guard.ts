import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { RUNTIME_CONFIG, RuntimeConfig } from '../../config/runtime-config';

const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

/**
 * Authenticates internal worker → API requests (claim, progress, completion callbacks).
 * Use together with @Public(): these routes carry a service credential, not a user token.
 * The comparison is constant-time and a missing or wrong credential is always rejected.
 */
@Injectable()
export class WorkerAuthGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(@Inject(RUNTIME_CONFIG) config: RuntimeConfig) {
    this.expected = digest(config.workerServiceSecret);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    const presented = match ? match[1].trim() : '';
    if (!presented || !timingSafeEqual(digest(presented), this.expected)) {
      throw new UnauthorizedException('Invalid service credentials');
    }
    return true;
  }
}
