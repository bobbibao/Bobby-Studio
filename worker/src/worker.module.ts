import { Logger, Module } from '@nestjs/common';
import { HttpInternalApi } from './api/internal-api-client';
import { loadWorkerConfig, WorkerRuntimeConfig } from './config/worker-config';
import { GenerationProcessor } from './generation/generation-processor';
import { createImageProvider } from './providers/provider.registry';
import { AssetStorage, GcsAssetStorage, LocalAssetStorage } from './storage/asset-storage';

export const WORKER_CONFIG = Symbol('WORKER_CONFIG');
export const GENERATION_PROCESSOR = Symbol('GENERATION_PROCESSOR');

export function createStorage(config: WorkerRuntimeConfig, bucket = process.env.BOBBY_GCS_BUCKET_NAME): AssetStorage {
  return config.storage.driver === 'local' ? new LocalAssetStorage(config.storage.localRoot!) : new GcsAssetStorage(bucket!);
}

@Module({
  providers: [
    { provide: WORKER_CONFIG, useFactory: () => loadWorkerConfig() },
    {
      provide: GENERATION_PROCESSOR,
      inject: [WORKER_CONFIG],
      useFactory: (config: WorkerRuntimeConfig) =>
        new GenerationProcessor({
          api: new HttpInternalApi(config.apiInternalUrl, config.workerServiceSecret),
          provider: createImageProvider(config.imageProvider, new Logger('ImageProvider')),
          storage: createStorage(config),
          logger: new Logger('GenerationProcessor'),
        }),
    },
  ],
  exports: [WORKER_CONFIG, GENERATION_PROCESSOR],
})
export class WorkerModule {}
