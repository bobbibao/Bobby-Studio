import { Global, Module } from '@nestjs/common';
import { RUNTIME_CONFIG, RuntimeConfig } from '../../config/runtime-config';
import { ASSET_STORAGE } from '../../infrastructure/storage/asset-storage';
import { GcsAssetStorage } from '../../infrastructure/storage/gcs-asset-storage';
import { LocalAssetStorage } from '../../infrastructure/storage/local-asset-storage';
import { AssetAccessService } from './asset-access.service';
import { AssetService } from './asset.service';
import { AssetsController } from './assets.controller';

@Global()
@Module({
  controllers: [AssetsController],
  providers: [
    AssetAccessService,
    AssetService,
    {
      provide: ASSET_STORAGE,
      inject: [RUNTIME_CONFIG],
      useFactory: (config: RuntimeConfig) =>
        config.storage.driver === 'local' ? new LocalAssetStorage(config.storage.localRoot!) : new GcsAssetStorage(config.storage.gcsBucket!),
    },
  ],
  exports: [AssetAccessService, AssetService, ASSET_STORAGE],
})
export class AssetsModule {}
