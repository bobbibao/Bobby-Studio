import { Controller, Get, Logger, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
// import { ModelCatalogService } from './model-catalog.service';
import { ModelCatalogService } from 'src/service/model-catalog/model-catalog.service';
import { ModelsResponseDto } from './dto/model-response.dto';

@ApiTags('Model Catalog')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('models')
export class ModelCatalogController {
  constructor(private readonly modelCatalogService: ModelCatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'Get model catalog filtered by the current user plan',
  })
  async getModels(@Request() req): Promise<ModelsResponseDto> {
    const plan = this.modelCatalogService.getPlanOrDefault(
      req.currentUser?.role,
    );
    const models = await this.modelCatalogService.getCatalogForPlan(plan);

    return {
      plan,
      models,
    };
  }
}

