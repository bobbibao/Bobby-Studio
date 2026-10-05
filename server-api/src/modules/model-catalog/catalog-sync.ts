import { Prisma, PrismaClient } from '@prisma/client';
import { ALL_PLANS, CATALOG_DEFINITIONS, CATALOG_VERSION } from './model-catalog.defaults';

type Db = Pick<PrismaClient, 'model' | 'modelPlanEntitlement'>;

export const sizeKey = (size: { width: number; height: number }) => `${size.width}x${size.height}`;

/**
 * Idempotent and non-destructive: models and plan entitlements are created when missing, and a
 * model's capability metadata and pricing are refreshed only when the shipped catalog version is
 * newer than the stored one. Nothing is ever deleted, so operator changes to entitlements survive.
 */
export async function syncCatalog(db: Db): Promise<{ created: number; refreshed: number }> {
  let created = 0;
  let refreshed = 0;
  for (const definition of CATALOG_DEFINITIONS) {
    const metadata: Prisma.InputJsonValue = {
      catalogVersion: CATALOG_VERSION,
      mode: definition.mode,
      isSimulated: definition.mode === 'simulated',
      capabilities: definition.capabilities as unknown as Prisma.InputJsonValue,
      limits: definition.limits as unknown as Prisma.InputJsonValue,
    };
    const existing = await db.model.findUnique({ where: { id: definition.id }, select: { metadata: true } });
    if (!existing) {
      await db.model.create({
        data: {
          id: definition.id,
          provider: definition.provider,
          displayName: definition.displayName,
          description: definition.description,
          sortOrder: definition.sortOrder,
          metadata,
          pricing: definition.pricing,
        },
      });
      created += 1;
    } else if (((existing.metadata as { catalogVersion?: number } | null)?.catalogVersion ?? 0) < CATALOG_VERSION) {
      await db.model.update({
        where: { id: definition.id },
        data: { displayName: definition.displayName, description: definition.description, metadata, pricing: definition.pricing },
      });
      refreshed += 1;
    }
    await db.modelPlanEntitlement.createMany({
      data: ALL_PLANS.map((plan) => ({
        modelId: definition.id,
        plan,
        enabled: true,
        allowedResolutions: definition.planSizes.map(sizeKey),
        metadata: { source: 'catalog-default' },
      })),
      skipDuplicates: true,
    });
  }
  return { created, refreshed };
}
