import { GenerationStatus } from './generation-status';

export interface GenerationEventProps<TPayload = Record<string, unknown>> {
  jobId?: string;
  requestId?: string;
  userId?: string;
  status?: GenerationStatus;
  payload?: TPayload;
}

export abstract class GenerationLifecycleEvent<TPayload = Record<string, unknown>> {
  readonly occurredAt = new Date();

  protected constructor(
    public readonly eventName: string,
    public readonly props: GenerationEventProps<TPayload>,
  ) {}
}

export class GenerationRequestedEvent<
  TPayload = Record<string, unknown>,
> extends GenerationLifecycleEvent<TPayload> {
  constructor(props: GenerationEventProps<TPayload>) {
    super('generation.requested', props);
  }
}

export class JobQueuedEvent<
  TPayload = Record<string, unknown>,
> extends GenerationLifecycleEvent<TPayload> {
  constructor(props: GenerationEventProps<TPayload>) {
    super('generation.job_queued', props);
  }
}

export class GenerationStartedEvent<
  TPayload = Record<string, unknown>,
> extends GenerationLifecycleEvent<TPayload> {
  constructor(props: GenerationEventProps<TPayload>) {
    super('generation.started', props);
  }
}

export class GenerationCompletedEvent<
  TPayload = Record<string, unknown>,
> extends GenerationLifecycleEvent<TPayload> {
  constructor(props: GenerationEventProps<TPayload>) {
    super('generation.completed', props);
  }
}

export class GenerationFailedEvent<
  TPayload = Record<string, unknown>,
> extends GenerationLifecycleEvent<TPayload> {
  constructor(props: GenerationEventProps<TPayload>) {
    super('generation.failed', props);
  }
}

export class GenerationCancelledEvent<
  TPayload = Record<string, unknown>,
> extends GenerationLifecycleEvent<TPayload> {
  constructor(props: GenerationEventProps<TPayload>) {
    super('generation.cancelled', props);
  }
}

export class CreditsDeductedEvent<
  TPayload = Record<string, unknown>,
> extends GenerationLifecycleEvent<TPayload> {
  constructor(props: GenerationEventProps<TPayload>) {
    super('generation.credits_deducted', props);
  }
}
