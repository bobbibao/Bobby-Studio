import { Global, Module } from '@nestjs/common';
import { AssetAccessService } from './asset-access.service';

@Global()
@Module({
  providers: [AssetAccessService],
  exports: [AssetAccessService],
})
export class AssetsModule {}
