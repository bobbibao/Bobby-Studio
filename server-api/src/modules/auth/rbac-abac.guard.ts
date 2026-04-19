import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../user/user.service';
// import { ResourceService } from '../resource/resource.service';

@Injectable()
export class RbacAbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService,
    // private resourceService: ResourceService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const userWithPermissions = await this.userService.getUserWithPermissions(user.userId);

    const hasPermission = requiredPermissions.every(permission =>
      userWithPermissions.permissions.some(p => p.name === permission) ||
      userWithPermissions.roles.some(role =>
        role.permissions.some(p => p.name === permission)
      )
    );

    if (!hasPermission) {
      return false;
    }

    // Check ABAC
    // const resource = await this.resourceService.getResourceWithPolicies(request.params.resourceId);

    // if (!resource) {
    //   return false;
    // }

    // // Evaluate policies
    // for (const policy of resource.policies) {
    //   const conditions = policy.conditions as Record<string, any>;
    //   if (!this.evaluateConditions(conditions, user, resource)) {
    //     return false;
    //   }
    // }

    return true;
  }

  private evaluateConditions(conditions: Record<string, any>, user: any, resource: any): boolean {
    // Implement your condition evaluation logic here
    // This is a simplified example
    for (const [key, value] of Object.entries(conditions)) {
      if (user[key] !== value && resource[key] !== value) {
        return false;
      }
    }
    return true;
  }
}
