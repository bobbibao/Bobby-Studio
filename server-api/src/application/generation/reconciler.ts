import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ASSET_STORAGE, AssetStorage } from '../../infrastructure/storage/asset-storage';
import { CreditLedgerService } from '../../modules/credits/credit-ledger.service';
import { readCheckpoint } from './claim-generation';
import { JobTerminator } from './job-terminator';

const DEADLINE_GRACE_MS = 30_000;
const STALE_UPDATE_MS = 60_000;
const MAX_PENDING_AGE_MS = 10 * 60_000;
const ASSET_SAFETY_MS = 60 * 60_000;

/**
 * Bounded repair loop. Everything here is idempotent and conditional, so it is safe to run on every API
 * replica. It never repeats paid inference: it only terminates, releases or cleans up.
 */
@Injectable()
export class GenerationReconciler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GenerationReconciler.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private lastCleanupAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly terminator: JobTerminator,
    private readonly ledger: CreditLedgerService,
    @Inject(ASSET_STORAGE) private readonly storage: AssetStorage,
  ) {}

  onModuleInit(): void {
    if (process.env.GENERATION_RECONCILER === 'off') return;
    this.timer = setInterval(() => void this.run(), Number(process.env.GENERATION_RECONCILE_INTERVAL_MS ?? 15_000));
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async run(): Promise<{ failed: number; released: number; cleaned: number }> {
    if (this.running) return { failed: 0, released: 0, cleaned: 0 };
    this.running = true;
    try {
      const failed = (await this.failOverdueExecutions()) + (await this.failStalePending());
      const released = await this.releaseSettledReservations();
      const cleaned = Date.now() - this.lastCleanupAt > 10 * 60_000 ? await this.cleanupExpiredAssets() : 0;
      if (cleaned > 0 || Date.now() - this.lastCleanupAt > 10 * 60_000) this.lastCleanupAt = Date.now();
      return { failed, released, cleaned };
    } catch (error) {
      this.logger.error(`Reconciliation pass failed: ${(error as Error).message}`);
      return { failed: 0, released: 0, cleaned: 0 };
    } finally {
      this.running = false;
    }
  }

  /**
   * Claimed jobs past their deadline whose worker went silent. If inference had started and no result was
   * stored, the paid outcome is unknown and must not be retried blindly; otherwise the deadline simply passed.
   * Capacity is released (executionFinishedAt) so a dead worker cannot block a session forever.
   */
  private async failOverdueExecutions(): Promise<number> {
    const cutoff = new Date(Date.now() - DEADLINE_GRACE_MS);
    const stale = new Date(Date.now() - STALE_UPDATE_MS);
    const overdue = await this.prisma.imageJob.findMany({
      where: { executionFinishedAt: null, attemptId: { not: null }, deadlineAt: { lt: cutoff }, updatedAt: { lt: stale } },
      select: { id: true, status: true, checkpoint: true },
      take: 50,
    });
    let count = 0;
    for (const job of overdue) {
      if (job.status === 'CANCELLED' || job.status === 'COMPLETED' || job.status === 'FAILED') {
        await this.prisma.imageJob.updateMany({ where: { id: job.id, executionFinishedAt: null }, data: { executionFinishedAt: new Date() } });
        count += 1;
        continue;
      }
      const unknown = readCheckpoint(job.checkpoint)?.phase === 'inference_started';
      if (await this.terminator.fail(job.id, unknown ? 'PROVIDER_OUTCOME_UNKNOWN' : 'DEADLINE_EXCEEDED', { executionFinished: true })) count += 1;
    }
    return count;
  }

  /** Jobs that never obtained execution capacity within a bounded time are failed, not left pending forever. */
  private async failStalePending(): Promise<number> {
    const stale = await this.prisma.imageJob.findMany({
      where: { status: 'PENDING', createdAt: { lt: new Date(Date.now() - MAX_PENDING_AGE_MS) } },
      select: { id: true },
      take: 50,
    });
    let count = 0;
    for (const job of stale) {
      if (await this.terminator.fail(job.id, 'DEADLINE_EXCEEDED', { executionFinished: true })) count += 1;
    }
    return count;
  }

  /** Repairs a hold that outlived its job (for example a crash between two writes in older code paths). */
  private async releaseSettledReservations(): Promise<number> {
    const orphans = await this.prisma.$queryRaw<Array<{ jobId: string }>>`
      SELECT r."jobId" FROM "CreditReservation" r JOIN "ImageJob" j ON j.id = r."jobId"
      WHERE r.status = 'RESERVED' AND j.status IN ('FAILED', 'CANCELLED') LIMIT 50`;
    let count = 0;
    for (const { jobId } of orphans) {
      const released = await this.prisma.$transaction((tx) => this.ledger.release(tx, jobId));
      if (released !== null) count += 1;
    }
    return count;
  }

  /** Expired previews/inputs not referenced by an unfinished job, and stray outputs of failed jobs. */
  private async cleanupExpiredAssets(): Promise<number> {
    const cutoff = new Date(Date.now() - ASSET_SAFETY_MS);
    const expired = await this.prisma.asset.findMany({
      where: { retention: { not: 'saved' }, expiresAt: { lt: cutoff } },
      take: 100,
    });
    let count = 0;
    for (const asset of expired) {
      const referenced = await this.prisma.imageJob.count({
        where: { status: { in: ['PENDING', 'QUEUED', 'PROCESSING'] }, payload: { path: ['inputAssetId'], equals: asset.id } },
      });
      if (referenced > 0) continue;
      await this.storage.delete(asset.storageKey).catch((error) => this.logger.warn(`Asset delete failed: ${(error as Error).message}`));
      await this.prisma.asset.delete({ where: { id: asset.id } }).catch(() => undefined);
      count += 1;
    }
    return count;
  }
}
