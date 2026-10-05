import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PlanType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CatalogModel, CatalogResponse, GenerationQuality } from '../../application/generation/contracts';
import { RUNTIME_CONFIG, RuntimeConfig } from '../../config/runtime-config';
import { DEFAULT_USER_ROLE } from '../../config/roles.config';
import { syncCatalog } from './catalog-sync';
import { ALL_PLANS } from './model-catalog.defaults';

export interface ActiveModel {
  model: CatalogModel;
  /** Per-plan size allow-list; absent or disabled means the plan may not use the model. */
  entitlements: Map<PlanType, { enabled: boolean; allowedSizes: string[] }>;
}

const CACHE_TTL_MS = 30_000;

/**
 * Single catalog authority (PostgreSQL via Prisma). Fail-closed: a model with no entitlement row for
 * the caller's plan is not available, and an empty catalog is empty. Only models belonging to the
 * active provider profile (provider + simulated/live) are served.
 */
@Injectable()
export class ModelCatalogService implements OnModuleInit {
  private readonly logger = new Logger(ModelCatalogService.name);
  private cache: { at: number; models: ActiveModel[] } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    const result = await syncCatalog(this.prisma);
    if (result.created || result.refreshed) {
      this.logger.log(`Catalog synchronized (created ${result.created}, refreshed ${result.refreshed})`);
    }
  }

  getPlan(plan?: string | null): PlanType {
    const upper = (plan ?? DEFAULT_USER_ROLE).toString().toUpperCase();
    if (upper === 'TEAM') return 'TEAM3';
    return (ALL_PLANS as string[]).includes(upper) ? (upper as PlanType) : 'FREE';
  }

  async getActiveModels(): Promise<ActiveModel[]> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) return this.cache.models;
    const rows = await this.prisma.model.findMany({
      where: { status: 'active', provider: this.config.imageProvider.id },
      include: { entitlements: true },
      orderBy: { sortOrder: 'asc' },
    });
    const models = rows
      .filter((row) => {
        const meta = row.metadata as { mode?: string } | null;
        return meta?.mode === this.config.imageProvider.mode;
      })
      .map<ActiveModel>((row) => {
        const meta = row.metadata as unknown as { isSimulated: boolean; capabilities: CatalogModel['capabilities']; limits: CatalogModel['limits'] };
        const pricing = row.pricing as unknown as Record<GenerationQuality, number>;
        return {
          model: {
            id: row.id,
            displayName: row.displayName,
            provider: row.provider as CatalogModel['provider'],
            isSimulated: meta.isSimulated,
            capabilities: meta.capabilities,
            limits: meta.limits,
            creditEstimate: { preview: pricing.preview, standard: pricing.standard },
            entitled: false,
          },
          entitlements: new Map(
            row.entitlements.map((e) => [e.plan, { enabled: e.enabled, allowedSizes: e.allowedResolutions }] as const),
          ),
        };
      });
    this.cache = { at: Date.now(), models };
    return models;
  }

  async getModel(modelId: string): Promise<ActiveModel | null> {
    return (await this.getActiveModels()).find((entry) => entry.model.id === modelId) ?? null;
  }

  async getCatalogForPlan(plan?: string | null): Promise<CatalogResponse> {
    const planCode = this.getPlan(plan);
    const models = await this.getActiveModels();
    return {
      plan: planCode,
      models: models.map(({ model, entitlements }) => ({
        ...model,
        entitled: entitlements.get(planCode)?.enabled === true,
      })),
    };
  }

  invalidate(): void {
    this.cache = null;
  }
}
