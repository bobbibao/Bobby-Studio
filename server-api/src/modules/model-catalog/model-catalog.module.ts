import { forwardRef, Module } from '@nestjs/common';
// import { ModelCatalogService } from './model-catalog.service';
import { ModelCatalogService } from 'src/service/model-catalog/model-catalog.service';
import { ModelCatalogController } from './model-catalog.controller';
import { PrismaService } from 'prisma/prisma.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [forwardRef(() => UserModule)],  
  providers: [ModelCatalogService, PrismaService],
  controllers: [ModelCatalogController],
  exports: [ModelCatalogService],
})
export class ModelCatalogModule {}

