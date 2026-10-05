import { Module } from '@nestjs/common';
import { ModelCatalogController } from './model-catalog.controller';
import { ModelCatalogService } from './model-catalog.service';

@Module({
  controllers: [ModelCatalogController],
  providers: [ModelCatalogService],
  exports: [ModelCatalogService],
})
export class ModelCatalogModule {}
