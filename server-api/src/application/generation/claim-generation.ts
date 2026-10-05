import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEADLINE_MS } from '../../domain/generation/job-state';
import { AssetDescriptor, ClaimResponse, GenerationIntent } from './contracts';
import { JobPayload } from './job-payload';
import { JobTerminator } from './job-terminator';
import { lockJob, transitionJob } from './job-store';
import { Inject } from '@nestjs/common';
import { GENERATION_NOTIFIER, GenerationNotifier } from './ports';
import { toUpdatedEvent } from './snapshot';

export const MAX_ATTEMPTS = 5;
export const hashRunToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export interface StoredCheckpoint {
  phase: 'inference_started' | 'result_stored' | 'completed';
  outputs?: AssetDescriptor[];
  providerRequestId?: string;
  startedAt?: string;
}

const PHASES = ['inference_started', 'result_stored', 'completed'];

/** Reads the stored JSON defensively: anything that is not a known checkpoint shape counts as none. */
export function readCheckpoint(value: Prisma.JsonValue | null | undefined): StoredCheckpoint | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const phase = (value as Record<string, unknown>).phase;
  return typeof phase === 'string' && PHASES.includes(phase) ? (value as unknown as StoredCheckpoint) : null;
}

/**
 * Worker claim. Grants a new attempt (id + secret run token) to exactly one worker at a time, tells it
 * whether earlier inference left a stored result (reuse it, never repeat inference) or an unknown
 * outcome (do not blindly repeat a paid call), and refuses terminal, cancelled or expired jobs.
 */
@Injectable()
export class ClaimGenerationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly terminator: JobTerminator,
    @Inject(GENERATION_NOTIFIER) private readonly notifier: GenerationNotifier,
  ) {}

  async execute(jobId: string): Promise<ClaimResponse> {
    const { response, changed } = await this.prisma.$transaction(async (tx) => {
      const job = await lockJob(tx, jobId);
      if (!job) return { response: { action: 'skip', reason: 'unknown_job' } as ClaimResponse, changed: null };

      if (job.status === 'COMPLETED' || job.status === 'FAILED') return { response: { action: 'skip', reason: 'terminal' } as ClaimResponse, changed: null };
      if (job.status === 'CANCELLED') {
        const reason = job.errorCode === 'SUPERSEDED' ? 'superseded' : 'cancelled';
        return { response: { action: 'skip', reason } as ClaimResponse, changed: null };
      }

      const now = Date.now();
      if (job.deadlineAt && job.deadlineAt.getTime() < now && job.attemptCount === 0) {
        // Waited in the queue past its budget without ever starting: no inference happened.
        const failed = await this.terminator.failInTx(tx, jobId, 'DEADLINE_EXCEEDED', { executionFinished: true });
        return { response: { action: 'skip', reason: 'expired' } as ClaimResponse, changed: failed };
      }
      if (job.attemptCount >= MAX_ATTEMPTS) {
        const checkpoint = readCheckpoint(job.checkpoint);
        const code = checkpoint?.phase === 'inference_started' ? 'PROVIDER_OUTCOME_UNKNOWN' : 'INTERNAL';
        const failed = await this.terminator.failInTx(tx, jobId, code, { executionFinished: true });
        return { response: { action: 'skip', reason: 'terminal' } as ClaimResponse, changed: failed };
      }

      // Single execution per studio session: another claimed, unfinished job blocks this one.
      if (job.studioSessionId) {
        const busy = await tx.imageJob.count({
          where: {
            studioSessionId: job.studioSessionId,
            id: { not: jobId },
            attemptId: { not: null },
            executionFinishedAt: null,
          },
        });
        if (busy > 0) return { response: { action: 'defer', retryAfterMs: 2000 } as ClaimResponse, changed: null };
      }

      const payload = job.payload as unknown as JobPayload;
      const checkpoint = readCheckpoint(job.checkpoint);
      const hasStoredResult = checkpoint?.phase === 'result_stored' && (checkpoint.outputs?.length ?? 0) > 0;
      // A previous attempt reached the provider and never reported a result: the paid outcome is unknown.
      const outcomeUnknown = checkpoint?.phase === 'inference_started';

      let input: AssetDescriptor | null = null;
      if (payload.inputAssetId) {
        const asset = await tx.asset.findUnique({ where: { id: payload.inputAssetId } });
        if (!asset) {
          const failed = await this.terminator.failInTx(tx, jobId, 'INVALID_INPUT', { executionFinished: true });
          return { response: { action: 'skip', reason: 'terminal' } as ClaimResponse, changed: failed };
        }
        input = { storageKey: asset.storageKey, mimeType: asset.mimeType, byteSize: asset.byteSize, sha256: asset.sha256, width: asset.width ?? 0, height: asset.height ?? 0 };
      }

      const runToken = randomBytes(32).toString('base64url');
      const deadlineAt = job.deadlineAt ?? new Date(now + DEADLINE_MS[job.intent as GenerationIntent]);
      const claimed = await transitionJob(tx, jobId, ['PENDING', 'QUEUED', 'PROCESSING'], {
        status: 'PROCESSING',
        attemptId: randomUUID(),
        runTokenHash: hashRunToken(runToken),
        attemptCount: { increment: 1 },
        lastEventSequence: 0,
        startedAt: job.startedAt ?? new Date(now),
        deadlineAt,
        stage: hasStoredResult ? 'storing' : 'provider',
        executionFinishedAt: null,
      });
      if (!claimed) return { response: { action: 'skip', reason: 'terminal' } as ClaimResponse, changed: null };

      return {
        response: {
          action: 'run',
          attemptId: claimed.attemptId!,
          runToken,
          checkpoint: hasStoredResult ? { outputs: checkpoint!.outputs!, providerRequestId: checkpoint!.providerRequestId } : null,
          outcomeUnknown: outcomeUnknown && !hasStoredResult,
          input,
          deadlineAt: deadlineAt.toISOString(),
        } as ClaimResponse,
        changed: claimed,
      };
    });
    if (changed?.userId) this.notifier.jobUpdated(changed.userId, toUpdatedEvent(changed, []));
    return response;
  }
}
