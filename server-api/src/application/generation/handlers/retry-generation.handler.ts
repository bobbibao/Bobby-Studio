import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { JobQueuedEvent } from '../../../domain/generation/generation.events';
import { GenerationStatus } from '../../../domain/generation/generation-status';
import { ImageGenerationResponseDto } from '../../../modules/image-generation/dto/image-response.dto';
import { ImageGenerationService } from '../../../modules/image-generation/image-generation.service';
import { RetryGenerationCommand } from '../commands/retry-generation.command';

@CommandHandler(RetryGenerationCommand)
export class RetryGenerationCommandHandler
  implements ICommandHandler<RetryGenerationCommand, ImageGenerationResponseDto>
{
  constructor(
    private readonly imageGenerationService: ImageGenerationService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RetryGenerationCommand): Promise<ImageGenerationResponseDto> {
    const response = await this.imageGenerationService.retryGenerationJob(
      command.jobId,
      command.userRole,
    );

    for (const jobId of response.jobIds) {
      this.eventBus.publish(
        new JobQueuedEvent({
          jobId,
          requestId: response.requestId,
          status: GenerationStatus.QUEUED,
          payload: { retriedFromJobId: command.jobId },
        }),
      );
    }

    return response;
  }
}
