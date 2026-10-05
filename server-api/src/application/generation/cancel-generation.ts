import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreditLedgerService } from '../../modules/credits/credit-ledger.service';
import { ApiException } from './api-error';
import { GenerationSnapshot } from './contracts';
import { GENERATION_NOTIFIER, GENERATION_QUEUE, GenerationNotifier, GenerationQueue } from './ports';
import { lockJob, transitionJob } from './job-store';
import { GenerationQueries } from './generation-queries';
import { toUpdatedEvent } from './snapshot';

@Injectable()
export class CancelGenerationUseCase {
  private readonly logger = new Logger(CancelGenerationUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CreditLedgerService,
    private readonly queries: GenerationQueries,
    @Inject(GENERATION_QUEUE) private readonly queue: GenerationQueue,
    @Inject(GENERATION_NOTIFIER) private readonly notifier: GenerationNotifier,
  ) {}

  /**
   * Logical cancellation. The job becomes CANCELLED immediately and its credits are released, but a
   * claimed job keeps its execution capacity until the worker reports that it actually stopped
   * (providers cannot abort in-flight work), so repeated cancels cannot multiply paid calls.
   * Cancel and finalize serialize on the job row: whichever transaction locks first decides.
   */
  async execute(userId: string, jobId: string): Promise<GenerationSnapshot> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const job = await lockJob(tx, jobId);
      if (!job || job.userId !== userId) throw new ApiException(404, 'NOT_FOUND', 'Generation not found');
      if (job.status === 'COMPLETED') throw new ApiException(409, 'ALREADY_COMPLETED', 'The generation already completed');
      if (job.status === 'CANCELLED' || job.status === 'FAILED') return { changed: null, wasUnclaimed: false };

      const unclaimed = job.attemptId === null;
      const now = new Date();
      const changed = await transitionJob(tx, jobId, ['PENDING', 'QUEUED', 'PROCESSING'], {
        status: 'CANCELLED',
        errorCode: 'CANCELLED',
        cancelledAt: now,
        cancellationRequestedAt: now,
        ...(unclaimed ? { executionFinishedAt: now } : {}),
      });
      if (changed) {
        await this.ledger.release(tx, jobId);
        await tx.generationOutbox.updateMany({ where: { jobId, publishedAt: null }, data: { publishedAt: now } });
      }
      return { changed, wasUnclaimed: unclaimed };
    });

    if (outcome.changed) {
      this.notifier.jobUpdated(userId, toUpdatedEvent(outcome.changed, []));
      if (outcome.wasUnclaimed) {
        void this.queue.remove(jobId).catch((error) => this.logger.warn(`Queue removal failed: ${(error as Error).message}`));
      }
    }
    return this.queries.get(userId, jobId);
  }
}
