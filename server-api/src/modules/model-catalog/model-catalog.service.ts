import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ModelStatus, PlanType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { DEFAULT_USER_ROLE } from 'src/config/roles.config';
import {
  DEFAULT_MODEL_CATALOG,
  ModelCatalogDefinition,
  ModelEntitlementConfig,
  PLAN_ORDER,
} from './model-catalog.defaults';
import {
  ModelCatalogResponseDto,
  ModelEntitlementDto,
} from './dto/model-response.dto';
import { PLAN_TYPE } from 'src/constant/user.constants';

const CACHE_KEY = 'model-catalog:all';
const CACHE_TTL_SECONDS = 60;
const FALLBACK_ALLOWED_RESOLUTIONS = ['1K', '2K', '4K'];

@Injectable()
export class ModelCatalogService {
  private readonly logger = new Logger(ModelCatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

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

    const models = await this.prisma.model.findMany({
      include: { entitlements: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (!models.length) {
      this.logger.warn(
        'Model catalog table is empty. Falling back to defaults.',
      );
      return DEFAULT_MODEL_CATALOG;
    }

    const normalized: ModelCatalogDefinition[] = models.map((model) => ({
      id: model.id,
      provider: model.provider,
      displayName: model.displayName,
      description: model.description ?? undefined,
      connectorFunction: (model as any).connectorFunction ?? undefined,
      status: model.status ?? ModelStatus.active,
      sortOrder: model.sortOrder ?? 0,
      pricing: model.pricing as Record<string, number> | null,
      metadata: (model.metadata as Record<string, any> | null) ?? null,
      entitlements: model.entitlements.map<ModelEntitlementConfig>(
        (entitlement) => ({
          plan: entitlement.plan,
          enabled: entitlement.enabled,
          allowedResolutions: entitlement.allowedResolutions ?? [],
          metadata:
            (entitlement.metadata as Record<string, any> | null) ?? undefined,
        }),
      ),
    }));

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
