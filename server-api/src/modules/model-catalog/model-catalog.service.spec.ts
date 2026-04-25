import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ModelStatus } from '@prisma/client';
// import { ModelCatalogService } from './model-catalog.service';
import { ModelCatalogService } from 'src/service/model-catalog/model-catalog.service';
import { PrismaService } from 'prisma/prisma.service';
import { DEFAULT_MODEL_CATALOG } from './model-catalog.defaults';

describe('ModelCatalogService', () => {
  let service: ModelCatalogService;
  let prisma: { model: { findMany: jest.Mock } };
  let cache: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    prisma = {
      model: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ModelCatalogService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = moduleRef.get<ModelCatalogService>(ModelCatalogService);
  });

  it('normalizes plan codes', () => {
    expect(service.getPlanOrDefault('basic')).toBe('BASIC');
    expect(service.getPlanOrDefault('TEAM3')).toBe('TEAM3');
    expect(service.getPlanOrDefault(null)).toBe('FREE');
  });

  it('returns fallback catalog when database is empty', async () => {
    const models = await service.getCatalogForPlan('FREE');
    const expectedActiveCount = DEFAULT_MODEL_CATALOG.filter(
      (model) => (model.status ?? ModelStatus.active) === ModelStatus.active,
    ).length;
    expect(models.length).toBe(expectedActiveCount);
    expect(models.every((m) => m.status === ModelStatus.active)).toBe(true);
  });

  it('uses cached catalog when available', async () => {
    cache.get.mockResolvedValue(DEFAULT_MODEL_CATALOG);
    const models = await service.getCatalogForPlan('PRO');
    expect(models.length).toBeGreaterThan(0);
    expect(cache.get).toHaveBeenCalledWith(expect.stringContaining('model-catalog'));
  });
});
