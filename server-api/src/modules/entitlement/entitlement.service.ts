import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  BASIC_USER_ROLE,
  DEFAULT_USER_ROLE,
  FREE_USER_ROLE,
  PRO_USER_ROLE,
  TEAM3_USER_ROLE,
  TEAM5_USER_ROLE,
  TEAM_USER_ROLE,
} from '../../config/roles.config';

const UNLIMITED_ROLES = [PRO_USER_ROLE, TEAM_USER_ROLE, TEAM3_USER_ROLE, TEAM5_USER_ROLE];

/**
 * Plan limits for projects and history. Model and size entitlements live in the catalog
 * (ModelCatalogService) and are enforced by the generation admission use case; unknown roles are
 * treated as the most restrictive plan.
 */
@Injectable()
export class EntitlementService {
  /** Maximum number of projects (null = unlimited). */
  getMaxProjects(userRole: string | null | undefined): number | null {
    const role = userRole || DEFAULT_USER_ROLE;
    if (UNLIMITED_ROLES.includes(role)) return null;
    return role === BASIC_USER_ROLE ? 5 : 1;
  }

  /** History window in months (null = unlimited). */
  getHistoryWindowMonths(userRole: string | null | undefined): number | null {
    const role = userRole || DEFAULT_USER_ROLE;
    if (UNLIMITED_ROLES.includes(role)) return null;
    return role === BASIC_USER_ROLE ? 2 : 1;
  }

  canCreateProject(userRole: string | null | undefined, currentProjectCount: number): boolean {
    const max = this.getMaxProjects(userRole);
    return max === null || currentProjectCount < max;
  }

  assertCanCreateProject(userRole: string | null | undefined, currentProjectCount: number): void {
    if (!this.canCreateProject(userRole, currentProjectCount)) {
      throw new ForbiddenException(this.getProjectLimitErrorMessage(userRole));
    }
  }

  getProjectLimitErrorMessage(userRole: string | null | undefined): string {
    const role = userRole || DEFAULT_USER_ROLE;
    if (role === FREE_USER_ROLE) return 'Free plan limited to 1 project. Upgrade for more projects.';
    if (role === BASIC_USER_ROLE) return 'Basic plan limited to 5 projects. Upgrade for unlimited projects.';
    return 'Project limit reached. Upgrade your plan.';
  }
}
