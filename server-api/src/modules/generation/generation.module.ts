import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ApiExceptionFilter } from '../../application/generation/api-exception.filter';
import { ApplyWorkerEventUseCase } from '../../application/generation/apply-worker-event';
import { CancelGenerationUseCase } from '../../application/generation/cancel-generation';
import { ClaimGenerationUseCase } from '../../application/generation/claim-generation';
import { GenerationQueries } from '../../application/generation/generation-queries';
import { JobTerminator } from '../../application/generation/job-terminator';
import { OutboxDispatcher } from '../../application/generation/outbox-dispatcher';
import { GENERATION_NOTIFIER, GENERATION_QUEUE } from '../../application/generation/ports';
import { GenerationReconciler } from '../../application/generation/reconciler';
import { RetryGenerationUseCase } from '../../application/generation/retry-generation';
import { SaveGenerationUseCase } from '../../application/generation/save-generation';
import { SubmitGenerationUseCase } from '../../application/generation/submit-generation';
import { BullMqGenerationQueue, GENERATION_QUEUE_NAME } from '../../infrastructure/queue/bullmq-generation.queue';
import { CreditsModule } from '../credits/credits.module';
import { ModelCatalogModule } from '../model-catalog/model-catalog.module';
import { MetricsController } from '../ops/metrics.controller';
import { GenerationEventsGateway } from './generation-events.gateway';
import { GenerationsController } from './generations.controller';
import { InternalGenerationsController } from './internal-generations.controller';

@Module({
  imports: [BullModule.registerQueue({ name: GENERATION_QUEUE_NAME }), CreditsModule, ModelCatalogModule],
  controllers: [GenerationsController, InternalGenerationsController, MetricsController],
  providers: [
    GenerationEventsGateway,
    BullMqGenerationQueue,
    { provide: GENERATION_QUEUE, useExisting: BullMqGenerationQueue },
    { provide: GENERATION_NOTIFIER, useExisting: GenerationEventsGateway },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    JobTerminator,
    GenerationQueries,
    SubmitGenerationUseCase,
    RetryGenerationUseCase,
    CancelGenerationUseCase,
    SaveGenerationUseCase,
    ClaimGenerationUseCase,
    ApplyWorkerEventUseCase,
    OutboxDispatcher,
    GenerationReconciler,
  ],
})
export class GenerationModule {}
