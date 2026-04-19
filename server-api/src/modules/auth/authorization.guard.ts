import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const userWithPermissions = await this.userService.getUserWithPermissions(user.userId);

    return requiredPermissions.every(permission =>
      userWithPermissions.permissions.some(p => p.name === permission) ||
      userWithPermissions.roles.some(role =>
        role.permissions.some(p => p.name === permission)
      )
    );
  }
}
