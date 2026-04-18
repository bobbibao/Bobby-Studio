import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  FREE_USER_ROLE,
  BASIC_USER_ROLE,
  PRO_USER_ROLE,
  DEFAULT_USER_ROLE,
  TEAM_USER_ROLE,
  TEAM3_USER_ROLE,
  TEAM5_USER_ROLE,
} from '../../config/roles.config';
import { MODELS } from '../../constant/model.constants';
import { DEFAULT_MODEL_CATALOG, PLAN_ORDER } from 'src/modules/model-catalog/model-catalog.defaults';

// import { ModelCatalogService } from './model-catalog.service';
import { ModelCatalogService } from 'src/service/model-catalog/model-catalog.service';

type PlanModelEntitlement = {
  modelId: string;
  enabled: boolean;
  allowedResolutions: string[];
};

/**
 * Service to check user subscription-based feature restrictions
 */
@Injectable()
export class EntitlementService {
  constructor(private readonly modelCatalogService: ModelCatalogService) {}

  private readonly fallbackEntitlementsByPlan: Record<
    string,
    PlanModelEntitlement[]
  > = this.buildFallbackEntitlements();

  private readonly FREE_ALLOWED_MODELS: string[] = Object.values(MODELS);
  private readonly BASIC_ALLOWED_MODELS: string[] = Object.values(MODELS);

  /**
   * Get allowed model list for a user role
   * @param userRole - User role (FREE, BASIC, PRO)
   * @returns Array of allowed model IDs
   */
  getAllowedModels(userRole: string | null | undefined): string[] {
    const role = userRole || DEFAULT_USER_ROLE;

    switch (role) {
      case FREE_USER_ROLE:
        return [...this.FREE_ALLOWED_MODELS];
      case BASIC_USER_ROLE:
        return [...this.BASIC_ALLOWED_MODELS];
      case PRO_USER_ROLE:
      case TEAM_USER_ROLE:
      case TEAM3_USER_ROLE:
      case TEAM5_USER_ROLE:
        // Paid users have access to Bobby AI
        return Object.values(MODELS);
      default:
        // Default to Free restrictions for unknown roles
        return [...this.FREE_ALLOWED_MODELS];
    }
  }

  /**
   * Get maximum number of projects allowed for a user role
   * @param userRole - User role (FREE, BASIC, PRO)
   * @returns Maximum number of projects (null = unlimited)
   */
  getMaxProjects(userRole: string | null | undefined): number | null {
    const role = userRole || DEFAULT_USER_ROLE;

    switch (role) {
      case FREE_USER_ROLE:
        return 1;
      case BASIC_USER_ROLE:
        return 5;
      case PRO_USER_ROLE:
      case TEAM_USER_ROLE:
      case TEAM3_USER_ROLE:
      case TEAM5_USER_ROLE:
        return null; // Unlimited
      default:
        // Default to Free restrictions
        return 1;
    }
  }

  /**
   * Get history window in months for a user role
   * @param userRole - User role (FREE, BASIC, PRO)
   * @returns History window in months (null = unlimited)
   */
  getHistoryWindowMonths(userRole: string | null | undefined): number | null {
    const role = userRole || DEFAULT_USER_ROLE;

    switch (role) {
      case FREE_USER_ROLE:
        return 1; // 1 month
      case BASIC_USER_ROLE:
        return 2; // 2 months
      case PRO_USER_ROLE:
      case TEAM_USER_ROLE:
      case TEAM3_USER_ROLE:
      case TEAM5_USER_ROLE:
        return null; // Unlimited
      default:
        // Default to Free restrictions
        return 1;
    }
  }

  /**
   * Check if a user can use a specific model
   * @param userRole - User role (FREE, BASIC, PRO)
   * @param modelId - Model ID to check
   * @returns true if user can use the model, false otherwise
   */
  canUseModel(userRole: string | null | undefined, modelId: string): boolean {
    const allowedModels = this.getAllowedModels(userRole);
    return allowedModels.includes(modelId);
  }

  /**
   * Check if a user can create a new project based on current project count
   * @param userRole - User role (FREE, BASIC, PRO)
   * @param currentProjectCount - Current number of projects the user has
   * @returns true if user can create a project, false otherwise
   */
  canCreateProject(
    userRole: string | null | undefined,
    currentProjectCount: number,
  ): boolean {
    const maxProjects = this.getMaxProjects(userRole);

    // If maxProjects is null, it means unlimited (PRO plan)
    if (maxProjects === null) {
      return true;
    }

    // Check if current count is less than max
    return currentProjectCount < maxProjects;
  }

  /**
   * Get user-friendly error message for project limit exceeded
   * @param userRole - User role (FREE, BASIC, PRO)
   * @returns Error message string
   */
  getProjectLimitErrorMessage(userRole: string | null | undefined): string {
    const role = userRole || DEFAULT_USER_ROLE;

    switch (role) {
      case FREE_USER_ROLE:
        return 'Free plan limited to 1 project. Please upgrade to Basic/PRO for more projects.';
      case BASIC_USER_ROLE:
        return 'Basic plan limited to 5 projects. Please upgrade to PRO for unlimited projects.';
      default:
        return 'Project limit reached. Please upgrade your plan.';
    }
  }

  /**
   * Get user-friendly error message for model restriction
   * @param userRole - User role (FREE, BASIC, PRO)
   * @param modelId - Model ID that was restricted
   * @returns Error message string
   */
  getModelRestrictionErrorMessage(
    userRole: string | null | undefined,
    modelId: string,
  ): string {
    const role = userRole || DEFAULT_USER_ROLE;
    const planName =
      role === FREE_USER_ROLE
        ? 'Free'
        : role === BASIC_USER_ROLE
          ? 'Basic'
          : role === PRO_USER_ROLE
            ? 'Pro'
            : 'your current';

    return `Model '${modelId}' is not available on ${planName} plan. Please upgrade to PRO to access all models.`;
  }

  async getPlanEntitlements(
    plan: string | null | undefined,
  ): Promise<PlanModelEntitlement[]> {
    const normalized = this.normalizePlan(plan);
    const catalog = await this.modelCatalogService.getCatalogForPlan(normalized);

    if (catalog.length > 0) {
      return catalog.map((model) => ({
        modelId: model.id,
        enabled: !!model.entitlements?.enabled,
        allowedResolutions: model.entitlements?.allowedResolutions ?? [],
      }));
    }

    return this.fallbackEntitlementsByPlan[normalized] ?? [];
  }

  async filterAllowedModels(
    plan: string | null | undefined,
    requestedModels: string[],
    fallbackCandidates?: string[],
  ): Promise<{
    allowedModels: string[];
    entitlements: Map<string, PlanModelEntitlement>;
  }> {
    const entitlements = await this.getPlanEntitlements(plan);
    const entMap = new Map<string, PlanModelEntitlement>();
    entitlements.forEach((ent) => entMap.set(ent.modelId, ent));

    const allowed = requestedModels.filter(
      (id) => entMap.get(id)?.enabled !== false,
    );

    if (allowed.length > 0) {
      return { allowedModels: allowed, entitlements: entMap };
    }

    const fallbackAllowed =
      fallbackCandidates?.filter((id) => entMap.get(id)?.enabled !== false) ??
      [];

    if (fallbackAllowed.length > 0) {
      return { allowedModels: fallbackAllowed, entitlements: entMap };
    }

    return { allowedModels: [], entitlements: entMap };
  }

  ensureResolutionAllowed(
    planEntitlements: Map<string, PlanModelEntitlement>,
    modelIds: string[],
    resolution?: string,
  ): void {
    if (!resolution) return;

    const normalizedRes = resolution.toUpperCase();
    const invalid = modelIds.filter((modelId) => {
      const entitlement = planEntitlements.get(modelId);
      if (!entitlement) return true;
      if (!entitlement.enabled) return true;
      if (!entitlement.allowedResolutions?.length) return false;
      return !entitlement.allowedResolutions
        .map((res) => res.toUpperCase())
        .includes(normalizedRes);
    });

    if (invalid.length > 0) {
      throw new ForbiddenException(
        `Resolution ${normalizedRes} is not allowed for models: ${invalid.join(
          ', ',
        )}`,
      );
    }
  }

  private normalizePlan(plan?: string | null): string {
    const upper = (plan || DEFAULT_USER_ROLE).toUpperCase();
    if (upper === 'TEAM') {
      return TEAM3_USER_ROLE;
    }
    if (PLAN_ORDER.includes(upper as any)) {
      return upper;
    }
    return DEFAULT_USER_ROLE;
  }

  private buildFallbackEntitlements(): Record<string, PlanModelEntitlement[]> {
    const result: Record<string, PlanModelEntitlement[]> = {};

    PLAN_ORDER.forEach((plan) => {
      result[plan] = DEFAULT_MODEL_CATALOG.map((model) => {
        const entitlement =
          model.entitlements.find((ent) => ent.plan === plan) ??
          model.entitlements[0];
        return {
          modelId: model.id,
          enabled: entitlement?.enabled ?? true,
          allowedResolutions: entitlement?.allowedResolutions ?? [],
        };
      });
    });

    return result;
  }
}

