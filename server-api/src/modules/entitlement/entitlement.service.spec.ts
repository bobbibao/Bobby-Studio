import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
// import { EntitlementService } from './entitlement.service';
import { EntitlementService } from 'src/service/entitlement/entitlement.service';
// import { ModelCatalogService } from './model-catalog.service';
import { ModelCatalogService } from 'src/service/model-catalog/model-catalog.service';

import { ModelStatus } from '@prisma/client';

describe('EntitlementService', () => {
  let service: EntitlementService;
  let modelCatalogService: { getCatalogForPlan: jest.Mock };

  beforeEach(async () => {
    modelCatalogService = {
      getCatalogForPlan: jest.fn().mockResolvedValue([
        {
          id: 'model-free',
          provider: 'test',
          displayName: 'Free Model',
          description: '',
          status: ModelStatus.active,
          sortOrder: 1,
          entitlements: {
            enabled: true,
            allowedResolutions: ['1K', '2K'],
          },
        },
        {
          id: 'model-pro',
          provider: 'test',
          displayName: 'Pro Only',
          description: '',
          status: ModelStatus.active,
          sortOrder: 2,
          entitlements: {
            enabled: false,
            allowedResolutions: ['1K', '2K', '4K'],
          },
        },
      ]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EntitlementService,
        { provide: ModelCatalogService, useValue: modelCatalogService },
      ],
    }).compile();

    service = moduleRef.get<EntitlementService>(EntitlementService);
  });

  it('filters out disabled models', async () => {
    const { allowedModels } = await service.filterAllowedModels('FREE', [
      'model-free',
      'model-pro',
    ]);
    expect(allowedModels).toEqual(['model-free']);
  });

  it('throws when resolution is not allowed', async () => {
    const { entitlements, allowedModels } =
      await service.filterAllowedModels('FREE', ['model-free']);

    expect(() =>
      service.ensureResolutionAllowed(entitlements, allowedModels, '4K'),
    ).toThrow(ForbiddenException);
  });
});

