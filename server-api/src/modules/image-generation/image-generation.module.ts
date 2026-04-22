import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CqrsModule } from '@nestjs/cqrs';

import { ImageGenerationController } from './image-generation.controller';
import { ImageGenerationService } from './image-generation.service';
import { ImageGenerationRepository } from './image-generation.repository';
import { JobStatusGateway } from './job-status.gateway';

import { RedisService } from '../../shared/services/redis.service';
import { VizpointModule } from '../vizpoint/vizpoint.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { ImageGenerationConfigService } from './image-generation-config.service';
import { AttributeModule } from '../attribute/attribute.module';
import { GCSConnector } from '../../connectors/gcs.connector';
import { PrismaService } from '../../../prisma/prisma.service';
import { EntitlementModule } from '../entitlement/entitlement.module';
import { CreditSystemModule } from '../credit-system/credit-system.module';

import { CreditSystemService } from '../credit-system/credit-system.service';
// import { ModelCatalogService } from '../model-catalog/model-catalog.service';
import { ModelCatalogService } from 'src/service/model-catalog/model-catalog.service';
import { GENERATION_REPOSITORY } from '../../application/generation/interfaces/generation-repository.interface';
import { GENERATION_QUEUE } from '../../application/generation/interfaces/generation-queue.interface';
import { GENERATION_STATUS_STORE } from '../../application/generation/interfaces/generation-status-store.interface';
import { PROMPT_ENHANCER } from '../../application/generation/interfaces/prompt-enhancer.interface';
import { GenerateImageCommandHandler } from '../../application/generation/handlers/generate-image.handler';
import { RetryGenerationCommandHandler } from '../../application/generation/handlers/retry-generation.handler';
import { CancelGenerationCommandHandler } from '../../application/generation/handlers/cancel-generation.handler';
import { GetGenerationStatusQueryHandler } from '../../application/generation/handlers/get-generation-status.handler';
import { GetGenerationResultQueryHandler } from '../../application/generation/handlers/get-generation-result.handler';
import { GetGenerationHistoryQueryHandler } from '../../application/generation/handlers/get-generation-history.handler';
import { GenerationLifecycleEventsHandler } from '../../application/generation/handlers/generation-lifecycle-events.handler';
import { BullMqGenerationQueue } from '../../infrastructure/queue/bullmq-generation.queue';
import { RedisGenerationStatusStore } from '../../infrastructure/redis/redis-generation-status.store';
import { GeminiPromptEnhancer } from '../../infrastructure/gemini/gemini-prompt-enhancer';
import { GoogleConnector } from '../../connectors/google.connector';
@Module({
  imports: [
    CqrsModule,
    BullModule.registerQueue({
      name: 'image-generation',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: true,
        delay: 0, // No delay by default
      },
    }),
    BullModule.registerQueue({
      name: 'image-post-processing',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: true,
        delay: 0, // No delay by default
      },
    }),
    AttributeModule,
    VizpointModule,
    AuthModule,
    forwardRef(() => UserModule),
    EntitlementModule,
    CreditSystemModule,
  ],
  controllers: [ImageGenerationController],
  providers: [
    ImageGenerationService,
    ImageGenerationRepository,
    ImageGenerationConfigService,
    RedisService,
    JobStatusGateway,
    GCSConnector,
    PrismaService,
    CreditSystemService,
    ModelCatalogService,
    GoogleConnector,
    GenerateImageCommandHandler,
    RetryGenerationCommandHandler,
    CancelGenerationCommandHandler,
    GetGenerationStatusQueryHandler,
    GetGenerationResultQueryHandler,
    GetGenerationHistoryQueryHandler,
    GenerationLifecycleEventsHandler,
    BullMqGenerationQueue,
    RedisGenerationStatusStore,
    GeminiPromptEnhancer,
    {
      provide: GENERATION_REPOSITORY,
      useExisting: ImageGenerationRepository,
    },
    {
      provide: GENERATION_QUEUE,
      useExisting: BullMqGenerationQueue,
    },
    {
      provide: GENERATION_STATUS_STORE,
      useExisting: RedisGenerationStatusStore,
    },
    {
      provide: PROMPT_ENHANCER,
      useExisting: GeminiPromptEnhancer,
    },
  ],
  exports: [ImageGenerationService, BullModule, RedisService],
})
export class ImageGenerationModule {}
