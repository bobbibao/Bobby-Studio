import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  GenerationCancelledEvent,
  GenerationCompletedEvent,
  GenerationFailedEvent,
  GenerationLifecycleEvent,
  GenerationRequestedEvent,
  GenerationStartedEvent,
  JobQueuedEvent,
} from '../../../domain/generation/generation.events';

type SupportedGenerationEvent =
  | GenerationRequestedEvent
  | JobQueuedEvent
  | GenerationStartedEvent
  | GenerationCompletedEvent
  | GenerationFailedEvent
  | GenerationCancelledEvent;

@EventsHandler(
  GenerationRequestedEvent,
  JobQueuedEvent,
  GenerationStartedEvent,
  GenerationCompletedEvent,
  GenerationFailedEvent,
  GenerationCancelledEvent,
)
export class GenerationLifecycleEventsHandler
  implements IEventHandler<SupportedGenerationEvent>
{
  private readonly logger = new Logger(GenerationLifecycleEventsHandler.name);

  handle(event: GenerationLifecycleEvent): void {
    this.logger.debug({
      event: event.eventName,
      ...event.props,
      occurredAt: event.occurredAt,
    });
  }
}
