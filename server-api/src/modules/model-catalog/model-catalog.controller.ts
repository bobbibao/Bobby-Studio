import { Controller, Get, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogResponse } from '../../application/generation/contracts';
import { AuthenticatedRequest } from '../identity/principal';
import { ModelCatalogService } from './model-catalog.service';

@ApiTags('Model Catalog')
@ApiBearerAuth()
@Controller('models')
export class ModelCatalogController {
  constructor(private readonly catalog: ModelCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Models of the active provider profile with the caller plan entitlement' })
  getModels(@Request() req: AuthenticatedRequest): Promise<CatalogResponse> {
    return this.catalog.getCatalogForPlan(req.currentUser.role);
  }
}
