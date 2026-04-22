import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

// Config
import { ApiKeysConfig } from './config/api-keys.config';
import { RedisConfig } from './config/redis.config';

import { PostProcessingProcessor } from './processors/post-processing.processor';
import { PythonModelProcessor } from './processors/python-model.processor';

// Services
import { StorageService } from './services/storage.service';
import { WebhookService } from './services/webhook.service';
import { RedisService } from './services/redis.service';

import { GCSConnector } from './services/connectors/gcs.connector';
import { PythonModelConnector } from './services/connectors/python-model.connector';
import { AI_PROVIDER } from './infrastructure/ai/ai-provider.interface';
import { BobbyPythonAIProvider } from './infrastructure/ai/bobby-python-ai.provider';
import { STORAGE_SERVICE } from './infrastructure/storage/storage-service.interface';

// Shared
import { QUEUE_NAMES } from './shared/constants/queue.constants';

const parseNumber = (
  value: string | number | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (
  value: string | boolean | undefined,
  fallback: boolean,
): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rawMaxRetries = configService.get<string>('REDIS_MAX_RETRIES');
        const parsedMaxRetries =
          rawMaxRetries === undefined || rawMaxRetries === ''
            ? null
            : Number.isFinite(Number(rawMaxRetries))
              ? Number(rawMaxRetries)
              : null;
        const connectionConfig = {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: parseNumber(configService.get<string>('REDIS_PORT', '6379'), 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: parseNumber(configService.get<string>('REDIS_DB', '0'), 0),
          maxRetriesPerRequest: parsedMaxRetries,
          connectTimeout: parseNumber(
            configService.get<string>('REDIS_CONNECT_TIMEOUT', '10000'),
            10000,
          ),
          lazyConnect: parseBoolean(
            configService.get<string>('REDIS_LAZY_CONNECT', 'true'),
            true,
          ),
        };
        return {
          connection: connectionConfig,
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.IMAGE_GENERATION,
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.IMAGE_POST_PROCESSING,
    }),
  ],
  controllers: [],
  providers: [
    // Config
    ApiKeysConfig,
    RedisConfig,

    // Processors
    PostProcessingProcessor,
    PythonModelProcessor,

    // Services
    StorageService,
    WebhookService,
    RedisService,

    // Connectors
    GCSConnector,
    PythonModelConnector,
    BobbyPythonAIProvider,
    {
      provide: AI_PROVIDER,
      useExisting: BobbyPythonAIProvider,
    },
    {
      provide: STORAGE_SERVICE,
      useExisting: StorageService,
    },
  ],
  exports: [
    PythonModelProcessor,
    PostProcessingProcessor,
    StorageService,
    WebhookService,
    RedisService,
    GCSConnector,
    PythonModelConnector,
    BobbyPythonAIProvider,
    AI_PROVIDER,
    STORAGE_SERVICE,
  ],
})
export class WorkerModule {}
