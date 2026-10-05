import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEADLINE_MS, MAX_ACTIVE_EXECUTIONS_PER_USER } from '../../domain/generation/job-state';
import { GenerationIntent, GenerationQueueMessageV1 } from './contracts';
import { JobPayload } from './job-payload';
import { JobTerminator } from './job-terminator';
import { GENERATION_NOTIFIER, GENERATION_QUEUE, GenerationNotifier, GenerationQueue } from './ports';
import { toUpdatedEvent } from './snapshot';
import { randomUUID } from 'crypto';

const LEASE_MS = 30_000;
export const MAX_DISPATCH_ATTEMPTS = 20;

interface Candidate {
  id: string;
  jobId: string;
}

/**
 * Transactional-outbox publisher. Dispatch intent was committed with the job; this poller turns it into
 * queue entries. Safe with several API replicas (lease + session row lock + idempotent queue job id) and
 * safe across crashes: a job that was marked QUEUED but never published is republished when its lease
 * expires, and the worker's claim protects against duplicate delivery.
 *
 * Admission control lives here: one physical execution per studio session and at most
 * MAX_ACTIVE_EXECUTIONS_PER_USER per user. Jobs beyond that stay PENDING (bounded by per-user limits).
 */
@Injectable()
export class OutboxDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcher.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly terminator: JobTerminator,
    @Inject(GENERATION_QUEUE) private readonly queue: GenerationQueue,
    @Inject(GENERATION_NOTIFIER) private readonly notifier: GenerationNotifier,
  ) {}

  onModuleInit(): void {
    if (process.env.GENERATION_DISPATCHER === 'off') return;
    this.timer = setInterval(() => void this.tick(), Number(process.env.GENERATION_DISPATCH_INTERVAL_MS ?? 400));
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One polling pass. Re-entrancy is guarded so a slow pass never overlaps the next. */
  async tick(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const candidates = await this.findCandidates();
      let published = 0;
      for (const candidate of candidates) {
        try {
          if (await this.dispatch(candidate)) published += 1;
        } catch (error) {
          this.logger.warn(`Dispatch of job ${candidate.jobId} failed (will be retried): ${(error as Error).message}`);
        }
      }
      return published;
    } finally {
      this.running = false;
    }
  }

  private findCandidates(): Promise<Candidate[]> {
    return this.prisma.$queryRaw<Candidate[]>`
      SELECT o.id, o."jobId"
      FROM "GenerationOutbox" o
      JOIN "ImageJob" j ON j.id = o."jobId"
      WHERE o."publishedAt" IS NULL
        AND o."nextAttemptAt" <= now()
        AND (o."leaseUntil" IS NULL OR o."leaseUntil" < now())
        AND j.status IN ('PENDING', 'QUEUED')
      ORDER BY o."createdAt"
      LIMIT 20`;
  }

  private async dispatch(candidate: Candidate): Promise<boolean> {
    const prepared = await this.prisma.$transaction(async (tx) => {
      const jobs = await tx.$queryRaw<Array<{ studioSessionId: string | null; userId: string | null }>>`
        SELECT "studioSessionId", "userId" FROM "ImageJob" WHERE id = ${candidate.jobId}`;
      if (jobs.length === 0) return null;
      const { studioSessionId, userId } = jobs[0];
      // Serialize per session so two replicas cannot start two jobs of one session.
      if (studioSessionId) await tx.$queryRaw`SELECT id FROM "StudioSession" WHERE id = ${studioSessionId} FOR UPDATE`;
      const [job] = await tx.$queryRaw<Array<{ id: string; status: string; intent: string; requestId: string; clientRevision: number | null }>>`
        SELECT id, status, intent, "requestId", "clientRevision" FROM "ImageJob" WHERE id = ${candidate.jobId} FOR UPDATE`;
      if (!job || (job.status !== 'PENDING' && job.status !== 'QUEUED')) return null;

      const outbox = await tx.generationOutbox.findUnique({ where: { id: candidate.id } });
      if (!outbox || outbox.publishedAt || (outbox.leaseUntil && outbox.leaseUntil > new Date())) return null;
      if (outbox.attempts >= MAX_DISPATCH_ATTEMPTS) {
        await this.terminator.failInTx(tx, job.id, 'INTERNAL', { executionFinished: true });
        return null;
      }

      if (job.status === 'PENDING') {
        const [sessionBusy] = studioSessionId
          ? await tx.$queryRaw<Array<{ n: bigint }>>`
              SELECT count(*) AS n FROM "ImageJob" a
              WHERE a."studioSessionId" = ${studioSessionId} AND a.id <> ${job.id}
                AND (a.status IN ('QUEUED', 'PROCESSING') OR (a."attemptId" IS NOT NULL AND a."executionFinishedAt" IS NULL))`
          : [{ n: BigInt(0) }];
        if (sessionBusy.n > BigInt(0)) return null;
        const [userBusy] = await tx.$queryRaw<Array<{ n: bigint }>>`
          SELECT count(*) AS n FROM "ImageJob" a
          WHERE a."userId" = ${userId} AND a.id <> ${job.id}
            AND (a.status IN ('QUEUED', 'PROCESSING') OR (a."attemptId" IS NOT NULL AND a."executionFinishedAt" IS NULL))`;
        if (userBusy.n >= BigInt(MAX_ACTIVE_EXECUTIONS_PER_USER)) return null;
      }

      const deadlineAt = new Date(Date.now() + DEADLINE_MS[job.intent as GenerationIntent]);
      const queued =
        job.status === 'PENDING'
          ? await tx.imageJob.update({ where: { id: job.id }, data: { status: 'QUEUED', stateVersion: { increment: 1 }, deadlineAt } })
          : await tx.imageJob.findUniqueOrThrow({ where: { id: job.id } });
      await tx.imageRequest.update({ where: { id: queued.requestId }, data: { status: 'QUEUED' } });
      await tx.generationOutbox.update({
        where: { id: candidate.id },
        data: { leaseUntil: new Date(Date.now() + LEASE_MS), attempts: { increment: 1 } },
      });
      return queued;
    });
    if (!prepared) return false;

    const payload = prepared.payload as unknown as JobPayload;
    const message: GenerationQueueMessageV1 = {
      schemaVersion: 1,
      jobId: prepared.id,
      requestId: prepared.requestId,
      studioSessionId: prepared.studioSessionId,
      clientRevision: prepared.clientRevision,
      intent: prepared.intent as GenerationIntent,
      modelId: payload.modelId,
      mode: payload.mode,
      prompt: payload.prompt,
      size: payload.size,
      quality: payload.quality,
      inputAssetId: payload.inputAssetId,
      inputHash: payload.inputHash,
      deadlineAt: (prepared.deadlineAt ?? new Date(Date.now() + DEADLINE_MS.final)).toISOString(),
      traceId: randomUUID(),
    };
    await this.queue.publish(message);
    await this.prisma.generationOutbox.update({ where: { id: candidate.id }, data: { publishedAt: new Date() } });
    if (prepared.userId) this.notifier.jobUpdated(prepared.userId, toUpdatedEvent(prepared, []));
    return true;
  }
}
