import { Inject, Injectable } from '@nestjs/common';
import { ImageJob, Prisma } from '@prisma/client';
import { timingSafeEqual } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreditLedgerService } from '../../modules/credits/credit-ledger.service';
import { PREVIEW_RETENTION_MS, isTerminal } from '../../domain/generation/job-state';
import { WorkerEventAck, WorkerEventDataByType, WorkerEventV1 } from './contracts';
import { hashRunToken, MAX_ATTEMPTS, StoredCheckpoint } from './claim-generation';
import { JobTerminator } from './job-terminator';
import { lockJob, transitionJob } from './job-store';
import { GENERATION_NOTIFIER, GenerationNotifier } from './ports';
import { toUpdatedEvent } from './snapshot';

interface Outcome {
  ack: WorkerEventAck;
  job: ImageJob | null;
  assetIds: string[];
}

const sameHash = (a: string, b: string): boolean => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Applies a worker callback. The API answers 200 only after the effect is durably committed or known to
 * be a harmless duplicate/stale event. Fencing: only the holder of the current attempt id and run token,
 * and only with a strictly increasing sequence, can change anything. Finalize and credit capture happen
 * in ONE transaction that also decides the cancel-versus-complete race through the job row lock.
 */
@Injectable()
export class ApplyWorkerEventUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CreditLedgerService,
    private readonly terminator: JobTerminator,
    @Inject(GENERATION_NOTIFIER) private readonly notifier: GenerationNotifier,
  ) {}

  async execute(jobId: string, event: WorkerEventV1): Promise<WorkerEventAck> {
    const outcome = await this.prisma.$transaction((tx) => this.apply(tx, jobId, event), { timeout: 20_000, maxWait: 10_000 });
    if (outcome.job?.userId) this.notifier.jobUpdated(outcome.job.userId, toUpdatedEvent(outcome.job, outcome.assetIds));
    return outcome.ack;
  }

  private async apply(tx: Prisma.TransactionClient, jobId: string, event: WorkerEventV1): Promise<Outcome> {
    const ignored = (reason: NonNullable<WorkerEventAck['reason']>): Outcome => ({ ack: { acknowledged: true, applied: false, reason }, job: null, assetIds: [] });
    const job = await lockJob(tx, jobId);
    if (!job || !job.attemptId || !job.runTokenHash) return ignored('stale_attempt');
    if (job.attemptId !== event.attemptId || !sameHash(job.runTokenHash, hashRunToken(event.runToken))) return ignored('stale_attempt');
    if (event.sequence <= job.lastEventSequence) return ignored('duplicate');

    // The sequence advances for every accepted event, including ones with no state effect.
    await tx.imageJob.update({ where: { id: jobId }, data: { lastEventSequence: event.sequence } });
    const terminal = isTerminal(job.status);

    switch (event.type) {
      case 'started': {
        if (terminal) return ignored('terminal');
        const checkpoint: StoredCheckpoint = { phase: 'inference_started', startedAt: event.occurredAt };
        return this.changed(await transitionJob(tx, jobId, ['PROCESSING'], { stage: 'provider', checkpoint: checkpoint as unknown as Prisma.InputJsonValue }));
      }
      case 'progress': {
        const data = event.data as WorkerEventDataByType['progress'];
        if (terminal) return ignored('terminal');
        if (job.stage === data.stage) return ignored('no_effect');
        return this.changed(await transitionJob(tx, jobId, ['PROCESSING'], { stage: data.stage }));
      }
      case 'checkpoint': {
        const data = event.data as WorkerEventDataByType['checkpoint'];
        if (terminal) return ignored('terminal');
        const checkpoint: StoredCheckpoint = { phase: 'result_stored', outputs: data.outputs, providerRequestId: data.providerRequestId };
        return this.changed(await transitionJob(tx, jobId, ['PROCESSING'], { stage: 'storing', checkpoint: checkpoint as unknown as Prisma.InputJsonValue }));
      }
      case 'completed':
        return this.complete(tx, job, event.data as WorkerEventDataByType['completed']);
      case 'failed':
        return this.fail(tx, job, event.data as WorkerEventDataByType['failed']);
    }
  }

  private changed(job: ImageJob | null): Outcome {
    return { ack: { acknowledged: true, applied: job !== null, ...(job ? {} : { reason: 'terminal' as const }) }, job, assetIds: [] };
  }

  private async complete(tx: Prisma.TransactionClient, job: ImageJob, data: WorkerEventDataByType['completed']): Promise<Outcome> {
    const noEffect: Outcome = { ack: { acknowledged: true, applied: false, reason: 'terminal' }, job: null, assetIds: [] };
    if (job.status === 'COMPLETED') return noEffect;
    if (isTerminal(job.status)) {
      // Late result for a cancelled/failed job: no resurrection, but the physical execution has ended.
      await tx.imageJob.update({ where: { id: job.id }, data: { executionFinishedAt: job.executionFinishedAt ?? new Date() } });
      return noEffect;
    }

    const prefix = `generated/${job.id}/`;
    if (data.outputs.some((output) => !output.storageKey.startsWith(prefix))) {
      const failed = await this.terminator.failInTx(tx, job.id, 'INTERNAL', { executionFinished: true });
      return { ack: { acknowledged: true, applied: failed !== null }, job: failed, assetIds: [] };
    }

    const expiresAt = new Date(Date.now() + PREVIEW_RETENTION_MS);
    await tx.asset.createMany({
      data: data.outputs.map((output, index) => ({
        ownerId: job.userId!,
        kind: 'output',
        storageKey: output.storageKey,
        mimeType: output.mimeType,
        byteSize: output.byteSize,
        sha256: output.sha256,
        width: output.width,
        height: output.height,
        retention: 'preview',
        expiresAt,
        jobId: job.id,
        outputIndex: index,
      })),
      skipDuplicates: true,
    });
    const assets = await tx.asset.findMany({ where: { jobId: job.id, kind: 'output' }, orderBy: { outputIndex: 'asc' }, select: { id: true } });

    const checkpoint: StoredCheckpoint = { phase: 'completed', outputs: data.outputs, providerRequestId: data.providerRequestId };
    const done = await transitionJob(tx, job.id, ['PENDING', 'QUEUED', 'PROCESSING'], {
      status: 'COMPLETED',
      stage: 'finalizing',
      errorCode: null,
      completedAt: new Date(),
      executionFinishedAt: new Date(),
      expiresAt,
      result: { assetIds: assets.map((asset) => asset.id), usage: data.usage ?? null, durationMs: data.durationMs } as Prisma.InputJsonValue,
      checkpoint: checkpoint as unknown as Prisma.InputJsonValue,
    });
    if (!done) return noEffect;
    await this.ledger.capture(tx, job.id);
    return { ack: { acknowledged: true, applied: true }, job: done, assetIds: assets.map((asset) => asset.id) };
  }

  private async fail(tx: Prisma.TransactionClient, job: ImageJob, data: WorkerEventDataByType['failed']): Promise<Outcome> {
    const noEffect: Outcome = { ack: { acknowledged: true, applied: false, reason: 'terminal' }, job: null, assetIds: [] };
    if (isTerminal(job.status)) {
      await tx.imageJob.update({ where: { id: job.id }, data: { executionFinishedAt: job.executionFinishedAt ?? new Date() } });
      return noEffect;
    }

    // A safe, retryable failure (no paid result can exist) keeps the job alive for the next attempt.
    if (data.retryable && !data.outcomeUnknown && job.attemptCount < MAX_ATTEMPTS) {
      const retrying = await transitionJob(tx, job.id, ['PROCESSING'], { stage: 'queued', checkpoint: Prisma.JsonNull });
      return this.changed(retrying);
    }
    const code = data.outcomeUnknown ? 'PROVIDER_OUTCOME_UNKNOWN' : data.errorCode;
    const failed = await this.terminator.failInTx(tx, job.id, code, { executionFinished: true });
    return { ack: { acknowledged: true, applied: failed !== null }, job: failed, assetIds: [] };
  }
}
