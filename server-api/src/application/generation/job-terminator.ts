import { Inject, Injectable } from '@nestjs/common';
import { ImageJob } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreditLedgerService } from '../../modules/credits/credit-ledger.service';
import { GenerationErrorCode } from './contracts';
import { GENERATION_NOTIFIER, GenerationNotifier } from './ports';
import { Tx, lockJob, transitionJob } from './job-store';
import { toUpdatedEvent } from './snapshot';

/**
 * Terminal failure with its financial effect (release) in the caller's transaction. Used by claim,
 * worker events, the dispatcher and the reconciler so they cannot disagree about what "failed" means.
 */
@Injectable()
export class JobTerminator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CreditLedgerService,
    @Inject(GENERATION_NOTIFIER) private readonly notifier: GenerationNotifier,
  ) {}

  /** Inside a transaction that already holds the job lock. Returns the failed job, or null if not applicable. */
  async failInTx(tx: Tx, jobId: string, code: GenerationErrorCode, options: { executionFinished: boolean }): Promise<ImageJob | null> {
    const failed = await transitionJob(tx, jobId, ['PENDING', 'QUEUED', 'PROCESSING'], {
      status: 'FAILED',
      errorCode: code,
      completedAt: new Date(),
      ...(options.executionFinished ? { executionFinishedAt: new Date() } : {}),
    });
    if (!failed) return null;
    await this.ledger.release(tx, jobId);
    await tx.generationOutbox.updateMany({ where: { jobId, publishedAt: null }, data: { publishedAt: new Date() } });
    return failed;
  }

  /** Standalone variant (own transaction and notification) for background workers. */
  async fail(jobId: string, code: GenerationErrorCode, options: { executionFinished: boolean }): Promise<boolean> {
    const failed = await this.prisma.$transaction(async (tx) => {
      const job = await lockJob(tx, jobId);
      if (!job) return null;
      return this.failInTx(tx, jobId, code, options);
    });
    if (failed?.userId) this.notifier.jobUpdated(failed.userId, toUpdatedEvent(failed, []));
    return failed !== null;
  }
}
