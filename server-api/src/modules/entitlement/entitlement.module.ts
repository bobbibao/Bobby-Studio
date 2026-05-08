import { Module } from '@nestjs/common';
// import { EntitlementService } from './entitlement.service';
import { EntitlementService } from 'src/service/entitlement/entitlement.service';
import { ModelCatalogModule } from '../model-catalog/model-catalog.module';

@Module({
  imports: [ModelCatalogModule],
  providers: [EntitlementService],
  exports: [EntitlementService],
})
export class EntitlementModule {}

