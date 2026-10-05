import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { syncCatalog } from '../../src/modules/model-catalog/catalog-sync';

// Idempotent and non-destructive: safe to run against any database, any number of times.
config({ path: resolve(__dirname, '../../.env') });
const prisma = new PrismaClient();

syncCatalog(prisma)
  .then((result) => console.log(`Model catalog synchronized (created ${result.created}, refreshed ${result.refreshed}).`))
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
