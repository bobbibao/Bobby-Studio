import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedRequest } from '../identity/principal';

/**
 * For routes that still carry a user id in the path or query, the id must be the caller's own.
 * Another user's id is reported as a missing resource so existence is not disclosed.
 * Must run after AuthGuard (which attaches the principal).
 */
@Injectable()
export class OwnUserScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const callerId = request.currentUser?.id;
    const claimed = [request.params?.userId, request.query?.userId].filter((value) => value !== undefined);
    for (const value of claimed) {
      if (typeof value !== 'string' || value !== callerId) {
        throw new NotFoundException('Resource not found');
      }
    }
    return true;
  }
}
