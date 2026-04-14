import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  DEFAULT_MODEL_CATALOG,
  ModelCatalogDefinition,
} from '../../src/modules/model-catalog/model-catalog.defaults';

const prisma = new PrismaClient();

const buildEntitlements = (catalog: ModelCatalogDefinition[]) =>
  catalog.flatMap((model) =>
    model.entitlements.map((entitlement) => ({
      id: uuidv4(),
      modelId: model.id,
      plan: entitlement.plan,
      enabled: entitlement.enabled,
      allowedResolutions: entitlement.allowedResolutions,
      metadata: entitlement.metadata ?? { source: 'seed' },
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );

async function seedModelCatalog() {
  const existing = await prisma.model.count();
  if (existing > 0) {
    await prisma.model.deleteMany();
    await prisma.modelPlanEntitlement.deleteMany();
  }

  console.log('🌱 Seeding model catalog and entitlements...');
  await prisma.model.createMany({
    data: DEFAULT_MODEL_CATALOG.map(
      ({
        id,
        provider,
        displayName,
        description,
        status,
        sortOrder,
        metadata,
        pricing,
      }) => ({
        id,
        provider,
        displayName,
        description,
        status,
        sortOrder,
        metadata,
        pricing,
      }),
    ),
  });

  const entitlements = buildEntitlements(DEFAULT_MODEL_CATALOG);
  await prisma.modelPlanEntitlement.createMany({
    data: entitlements,
    skipDuplicates: true,
  });

  console.log(
    `✅ Seeded ${DEFAULT_MODEL_CATALOG.length} models and ${entitlements.length} entitlements.`,
  );
}

async function main() {
  await seedModelCatalog();
}

main()
  .catch((e) => {
    console.error('❌ Error while updating UUIDs:', e);
    // process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
