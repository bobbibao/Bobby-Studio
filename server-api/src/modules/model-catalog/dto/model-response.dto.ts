import { ApiProperty } from '@nestjs/swagger';
import { ModelStatus } from '@prisma/client';

export class ModelEntitlementDto {
  @ApiProperty({ description: 'Whether the model is enabled for the plan' })
  enabled: boolean;

  @ApiProperty({
    description: 'Allowed output resolutions for the plan',
    type: [String],
  })
  allowedResolutions: string[];

  @ApiProperty({ description: 'Additional entitlement metadata', required: false })
  metadata?: Record<string, any> | null;
}

export class ModelCatalogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  provider: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ required: false })
  description?: string | null;

  @ApiProperty({ enum: ModelStatus, default: ModelStatus.active })
  status: ModelStatus;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ required: false })
  metadata?: Record<string, any> | null;

  @ApiProperty({ required: false })
  connectorFunction?: string | null;

  @ApiProperty({ type: () => ModelEntitlementDto })
  entitlements: ModelEntitlementDto;

  @ApiProperty({ required: false })
  pricing?: Record<string, number> | null;
}

export class ModelsResponseDto {
  @ApiProperty()
  plan: string;

  @ApiProperty({ type: [ModelCatalogResponseDto] })
  models: ModelCatalogResponseDto[];
}

