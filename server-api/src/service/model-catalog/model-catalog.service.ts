import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ModelStatus, PlanType } from '@prisma/client';
import DatabaseManager from '../../database/DatabaseManager';
import { Model, ModelPlanEntitlement } from '../../database/models';
import { DEFAULT_USER_ROLE } from 'src/config/roles.config';
import { isDatabaseConfigured } from 'src/shared/utils/env.utils';
import {
  DEFAULT_MODEL_CATALOG,
  ModelCatalogDefinition,
  ModelEntitlementConfig,
  PLAN_ORDER,
} from '../../modules/model-catalog/model-catalog.defaults';
import {
  ModelCatalogResponseDto,
  ModelEntitlementDto,
} from '../../modules/model-catalog/dto/model-response.dto';
import { PLAN_TYPE } from 'src/constant/user.constants';

const CACHE_KEY = 'model-catalog:all';
const CACHE_TTL_SECONDS = 60;
const FALLBACK_ALLOWED_RESOLUTIONS = ['1K', '2K', '4K'];

@Injectable()
export class ModelCatalogService {
  private readonly logger = new Logger(ModelCatalogService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async ensureDatabase(): Promise<void> {
    await DatabaseManager.getInstance().ensureInitialized();
  }

  getPlanOrDefault(plan?: string | null): PlanType {
    const upper = (plan || DEFAULT_USER_ROLE).toString().toUpperCase();
    if (upper === 'TEAM') {
      return 'TEAM3' as PlanType;
    }
    if (PLAN_ORDER.includes(upper as PLAN_TYPE)) {
      return upper as PlanType;
    }
    return DEFAULT_USER_ROLE as PlanType;
  }

  async getCatalog(forceRefresh = false): Promise<ModelCatalogDefinition[]> {
    if (!forceRefresh) {
      const cached = await this.cacheManager.get<ModelCatalogDefinition[]>(
        CACHE_KEY,
      );
      if (cached) {
        return cached;
      }
    }

    if (process.env.NODE_ENV === 'test') {
      return DEFAULT_MODEL_CATALOG;
    }

    if (!isDatabaseConfigured()) {
      this.logger.warn('DATABASE_URL is missing or placeholder. Using default model catalog.');
      return DEFAULT_MODEL_CATALOG;
    }

    await this.ensureDatabase();

    const models = await Model.findAll({
      include: [
        {
          model: ModelPlanEntitlement,
          as: 'entitlements',
          required: false,
        },
      ],
      order: [['sortOrder', 'ASC']],
    });

    if (!models.length) {
      this.logger.warn(
        'Model catalog table is empty. Falling back to defaults.',
      );
      return DEFAULT_MODEL_CATALOG;
    }

    const normalized: ModelCatalogDefinition[] = models.map((model) => {
      const entitlements =
        model.entitlements?.map<ModelEntitlementConfig>((entitlement) => ({
          plan: entitlement.plan,
          enabled: entitlement.enabled,
          allowedResolutions: entitlement.allowedResolutions ?? [],
          metadata:
            (entitlement.metadata as Record<string, any> | null) ?? undefined,
        })) ?? [];

      return {
        id: model.id,
        provider: model.provider,
        displayName: model.displayName,
        description: model.description ?? undefined,
        connectorFunction: (model as any).connectorFunction ?? undefined,
        status: model.status ?? ModelStatus.active,
        sortOrder: model.sortOrder ?? 0,
        pricing: (model.pricing as Record<string, number> | null) ?? null,
        metadata: (model.metadata as Record<string, any> | null) ?? null,
        entitlements,
      };
    });

    const existingIds = new Set(normalized.map((item) => item.id));
    const missingDefaults = DEFAULT_MODEL_CATALOG.filter(
      (item) => !existingIds.has(item.id),
    );

    const mergedCatalog =
      missingDefaults.length > 0
        ? [...normalized, ...missingDefaults].sort(
            (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0),
          )
        : normalized;

    if (missingDefaults.length > 0) {
      this.logger.warn(
        `Model catalog is missing ${missingDefaults.length} default model(s). Appending defaults: ${missingDefaults
          .map((m) => m.id)
          .join(', ')}`,
      );
    }

    await this.cacheManager.set(CACHE_KEY, mergedCatalog, CACHE_TTL_SECONDS);
    return mergedCatalog;
  }

  async getCatalogForPlan(
    plan?: string | null,
  ): Promise<ModelCatalogResponseDto[]> {
    const planCode = this.getPlanOrDefault(plan);
    const catalog = await this.getCatalog();
    const activeCatalog =
      catalog.length > 0 ? catalog : DEFAULT_MODEL_CATALOG;

    const filtered = this.toPlanCatalog(activeCatalog, planCode).filter(
      (model) => model.entitlements.enabled && model.status === ModelStatus.active,
    );

    return filtered;
  }

  async refreshCache(): Promise<void> {
    const catalog = await this.getCatalog(true);
    await this.cacheManager.set(CACHE_KEY, catalog, CACHE_TTL_SECONDS);
  }

  private toPlanCatalog(
    catalog: ModelCatalogDefinition[],
    plan: PlanType,
  ): ModelCatalogResponseDto[] {
    return catalog.map<ModelCatalogResponseDto>((model) => {
      const entitlement = this.pickEntitlement(model.entitlements, plan);
      const enabled = entitlement?.enabled ?? true;
      const allowedResolutions =
        entitlement?.allowedResolutions?.length === 0
          ? FALLBACK_ALLOWED_RESOLUTIONS
          : entitlement?.allowedResolutions ?? FALLBACK_ALLOWED_RESOLUTIONS;

      return {
        id: model.id,
        provider: model.provider,
        displayName: model.displayName,
        description: model.description,
        status: (model.status as ModelStatus) ?? ModelStatus.active,
        sortOrder: model.sortOrder,
        metadata: model.metadata ?? undefined,
        pricing: model.pricing as Record<string, number> | null,
        connectorFunction:
          (model as any).connectorFunction ??
          (model.metadata as any)?.connectorFunction ??
          null,
        entitlements: {
          enabled,
          allowedResolutions,
          metadata: entitlement?.metadata,
        } as ModelEntitlementDto,
      };
    });
  }

  private pickEntitlement(
    entitlements: ModelEntitlementConfig[],
    plan: PlanType,
  ): ModelEntitlementConfig | undefined {
    return (
      entitlements.find((ent) => ent.plan === plan) ??
      entitlements.find((ent) => ent.plan === DEFAULT_USER_ROLE)
    );
  }
}
