import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BASIC_USER_ROLE, DEFAULT_USER_ROLE, FREE_USER_ROLE, PRO_USER_ROLE } from '../../config/roles.config';
import { AuthenticatedRequest } from '../identity/principal';
import { PrincipalService } from '../identity/principal.service';
import { IS_PUBLIC_KEY } from './public.decorator';

// Role metadata
export const ROLE_KEY = 'role';
export const Role = (role: string) => SetMetadata(ROLE_KEY, role);

/**
 * Registered globally (APP_GUARD): every route requires a verified Firebase identity unless it is
 * explicitly marked @Public(). The principal is attached to the request once and reused by
 * controller-level @UseGuards(AuthGuard) declarations.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly principals: PrincipalService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.currentUser) {
      const token = this.extractBearerToken(request.headers.authorization);
      if (!token) throw new UnauthorizedException('Missing bearer token');
      request.currentUser = await this.principals.authenticateToken(token);
    }

    const requiredRole =
      this.reflector.getAllAndOverride<string>(ROLE_KEY, [context.getHandler(), context.getClass()]) ??
      DEFAULT_USER_ROLE;
    const userRole = request.currentUser.role;
    const allowed =
      requiredRole === FREE_USER_ROLE ||
      requiredRole === userRole ||
      (requiredRole === BASIC_USER_ROLE && userRole === PRO_USER_ROLE);
    if (!allowed) throw new ForbiddenException('Your plan does not include this feature');
    return true;
  }

  private extractBearerToken(header: string | undefined): string | null {
    if (!header) return null;
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    return match ? match[1].trim() : null;
  }
}
