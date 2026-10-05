import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUser } from '../../modules/identity/principal';
import { ApiException } from './api-error';
import { CreateGenerationRequest, GenerationAccepted } from './contracts';
import { JobPayload } from './job-payload';
import { SubmitGenerationUseCase } from './submit-generation';

/**
 * Retry creates a NEW job with its own idempotency key and revalidates permissions, balance and
 * capabilities. It repeats the same input at the session's current revision; if the input moved on, it is stale.
 */
@Injectable()
export class RetryGenerationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submit: SubmitGenerationUseCase,
  ) {}

  async execute(principal: CurrentUser, jobId: string, idempotencyKey: string | undefined): Promise<GenerationAccepted> {
    const original = await this.prisma.imageJob.findUnique({ where: { id: jobId } });
    if (!original || original.userId !== principal.id) throw new ApiException(404, 'NOT_FOUND', 'Generation not found');
    if (original.status !== 'FAILED' && original.status !== 'CANCELLED') {
      throw new ApiException(409, 'INVALID_INPUT', 'Only failed or cancelled generations can be retried');
    }
    if (!original.studioSessionId || original.clientRevision === null) {
      throw new ApiException(409, 'INVALID_INPUT', 'This generation cannot be retried');
    }
    const payload = original.payload as unknown as JobPayload;
    const request: CreateGenerationRequest = {
      studioSessionId: original.studioSessionId,
      clientRevision: original.clientRevision,
      intent: original.intent as CreateGenerationRequest['intent'],
      modelId: payload.modelId,
      mode: payload.mode,
      prompt: payload.prompt,
      inputAssetId: payload.inputAssetId ?? undefined,
      size: payload.size,
      quality: payload.quality,
    };
    return this.submit.execute({ principal, idempotencyKey, request, retryOf: original });
  }
}
