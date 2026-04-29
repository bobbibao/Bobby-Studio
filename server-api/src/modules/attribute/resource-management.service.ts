import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { PolicyService } from '../policy/policy.service';
// import { ResourceService } from '../resource/resource.service';
import { GenerateResourceParamsDto } from './dto/generate-params.dto';

@Injectable()
export class ResourceManagementService {
  constructor(
    private readonly userService: UserService,
    private readonly policyService: PolicyService,
    // private readonly resourceService: ResourceService,
  ) {}

  private async calculateBilling(data: any, configuration: any): Promise<any> {
    // Implement billing calculation logic
    // Return billing details
  }

  private isBillingSatisfactory(billingDetails: any): boolean {
    // Implement logic to check if billing is satisfactory
    // Return true if conditions are met, otherwise false
    return true;
  }

  async grantPermissionToUser(userId: string, permissionId: string) {
    // Implement logic to grant permission to a user
    return this.userService.addPermissionToUser(userId, permissionId);
  }

  async grantPolicyToUser(userId: string, policyId: string) {
    // Implement logic to grant policy to a user
    return this.policyService.assignPolicyToUser(userId, policyId);
  }

  // async getResourcesForUser(userId: string): Promise<Configuration[]> {
  //   const user = await this.userService.getUserWithPermissions(userId);
  //   if (!user) {
  //     throw new Error('User not found');
  //   }

  //   const permissionNames = user.permissions.map(permission => permission.name);
  //   return this.resourceService.getConfigurationsByRoles(permissionNames);
  // }

}
