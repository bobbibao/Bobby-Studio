import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { GenerationCancelledEvent } from '../../../domain/generation/generation.events';
import { GenerationStatus } from '../../../domain/generation/generation-status';
import { ImageGenerationService } from '../../../modules/image-generation/image-generation.service';
import { CancelGenerationCommand } from '../commands/cancel-generation.command';

export interface CancelGenerationResult {
  jobId: string;
  status: GenerationStatus.CANCELLED;
  removedFromQueue: boolean;
  message: string;
}

@CommandHandler(CancelGenerationCommand)
export class CancelGenerationCommandHandler
  implements ICommandHandler<CancelGenerationCommand, CancelGenerationResult>
{
  constructor(
    private readonly imageGenerationService: ImageGenerationService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CancelGenerationCommand): Promise<CancelGenerationResult> {
    const result = await this.imageGenerationService.cancelGenerationJob(command.jobId);

    this.eventBus.publish(
      new GenerationCancelledEvent({
        jobId: command.jobId,
        status: GenerationStatus.CANCELLED,
        payload: result,
      }),
    );

    return result;
  }
}
