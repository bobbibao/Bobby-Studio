import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import {
  GenerationRequestedEvent,
  JobQueuedEvent,
} from '../../../domain/generation/generation.events';
import { GenerationStatus } from '../../../domain/generation/generation-status';
import { ImageGenerationResponseDto } from '../../../modules/image-generation/dto/image-response.dto';
import { ImageGenerationService } from '../../../modules/image-generation/image-generation.service';
import { GenerateImageCommand } from '../commands/generate-image.command';

@CommandHandler(GenerateImageCommand)
export class GenerateImageCommandHandler
  implements ICommandHandler<GenerateImageCommand, ImageGenerationResponseDto>
{
  constructor(
    private readonly imageGenerationService: ImageGenerationService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: GenerateImageCommand): Promise<ImageGenerationResponseDto> {
    this.eventBus.publish(
      new GenerationRequestedEvent({
        userId: command.dto.userId,
        status: GenerationStatus.PENDING,
        payload: { mode: command.dto.mode },
      }),
    );

    const response = await this.imageGenerationService.generateSdxlImage(
      command.dto,
      command.userRole,
    );

    for (const jobId of response.jobIds) {
      this.eventBus.publish(
        new JobQueuedEvent({
          jobId,
          requestId: response.requestId,
          userId: command.dto.userId,
          status: GenerationStatus.QUEUED,
        }),
      );
    }

    return response;
  }
}
