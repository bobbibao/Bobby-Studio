import { Inject, Injectable, Logger } from '@nestjs/common';
import { ImageJob, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUser } from '../../modules/identity/principal';
import { CreditLedgerService } from '../../modules/credits/credit-ledger.service';
import { ModelCatalogService } from '../../modules/model-catalog/model-catalog.service';
import { sizeKey } from '../../modules/model-catalog/catalog-sync';
import { MAX_PROMPT_CHARS } from './contracts/create-generation.dto';
import { minPreviewIntervalMs, PREVIEW_RETENTION_MS } from '../../domain/generation/job-state';
import { ApiException } from './api-error';
import { CreateGenerationRequest, GenerationAccepted, GenerationIntent, JobStatus } from './contracts';
import { computeInputHash, JobPayload } from './job-payload';
import { GENERATION_NOTIFIER, GENERATION_QUEUE, GenerationNotifier, GenerationQueue } from './ports';
import { toUpdatedEvent } from './snapshot';
import { Tx } from './job-store';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const POLL_AFTER_MS = 2000;
/** Bounded admission: a user cannot accumulate an unbounded backlog of unfinished jobs. */
export const MAX_NONTERMINAL_PER_USER = 6;

export const toAccepted = (job: ImageJob, isSimulated = job.isSimulated): GenerationAccepted => ({
  id: job.id,
  requestId: job.requestId,
  studioSessionId: job.studioSessionId ?? '',
  clientRevision: job.clientRevision ?? 0,
  intent: job.intent as GenerationIntent,
  status: job.status as JobStatus,
  stateVersion: job.stateVersion,
  isSimulated,
  pollAfterMs: POLL_AFTER_MS,
});

export interface SubmitOptions {
  principal: CurrentUser;
  idempotencyKey: string | undefined;
  request: CreateGenerationRequest;
  /** Set for retries: the failed or cancelled job being repeated as a new intent. */
  retryOf?: ImageJob;
}

interface AdmissionResult {
  job: ImageJob;
  replayed: boolean;
  superseded: ImageJob[];
}

@Injectable()
export class SubmitGenerationUseCase {
  private readonly logger = new Logger(SubmitGenerationUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: ModelCatalogService,
    private readonly ledger: CreditLedgerService,
    @Inject(GENERATION_QUEUE) private readonly queue: GenerationQueue,
    @Inject(GENERATION_NOTIFIER) private readonly notifier: GenerationNotifier,
  ) {}

  async execute(options: SubmitOptions): Promise<GenerationAccepted> {
    const { principal, idempotencyKey, request } = options;
    if (!idempotencyKey || !UUID.test(idempotencyKey)) {
      throw new ApiException(400, 'INVALID_INPUT', 'The Idempotency-Key header must be a UUID created once per submit intent', {
        fieldErrors: [{ field: 'Idempotency-Key', message: 'must be a UUID' }],
      });
    }

    const validated = await this.validate(principal, request);
    const intent = request.intent;
    const hash = computeInputHash({
      prompt: request.prompt,
      inputSha256: validated.inputSha256,
      modelId: request.modelId,
      mode: request.mode,
      size: request.size,
      quality: request.quality,
      intent,
    });

    let result: AdmissionResult;
    try {
      result = await this.admit(options, validated, hash);
    } catch (error) {
      // Two first-time requests with the same key racing on different sessions: the loser re-reads the winner.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.imageRequest.findUnique({
          where: { userId_idempotencyKey: { userId: principal.id, idempotencyKey } },
          include: { jobs: true },
        });
        if (existing?.jobs[0]) {
          if (existing.inputHash !== hash) throw this.conflict();
          return toAccepted(existing.jobs[0]);
        }
      }
      throw error;
    }

    this.publishAfterCommit(result, principal.id);
    return toAccepted(result.job);
  }

  private conflict(): ApiException {
    return new ApiException(409, 'IDEMPOTENCY_CONFLICT', 'This Idempotency-Key was already used with different input');
  }

  /** Everything checked before any write: model, entitlement, capabilities, limits and the input asset. */
  private async validate(principal: CurrentUser, request: CreateGenerationRequest) {
    const fieldErrors: Array<{ field: string; message: string }> = [];
    const entry = await this.catalog.getModel(request.modelId);
    if (!entry) {
      throw new ApiException(422, 'UNSUPPORTED_CAPABILITY', 'The selected model is not available', {
        fieldErrors: [{ field: 'modelId', message: 'unknown or unavailable model' }],
      });
    }
    const plan = this.catalog.getPlan(principal.role);
    const entitlement = entry.entitlements.get(plan);
    if (!entitlement?.enabled) {
      throw new ApiException(403, 'NOT_ENTITLED', 'Your plan does not include the selected model');
    }

    const { capabilities, limits } = entry.model;
    if (!capabilities.modes.includes(request.mode)) fieldErrors.push({ field: 'mode', message: 'not supported by the selected model' });
    if (!capabilities.qualities.includes(request.quality)) fieldErrors.push({ field: 'quality', message: 'not supported by the selected model' });
    const key = sizeKey(request.size);
    if (!capabilities.sizes.some((size) => sizeKey(size) === key) || !entitlement.allowedSizes.includes(key)) {
      fieldErrors.push({ field: 'size', message: `${key} is not available for the selected model and plan` });
    }
    if (request.prompt.length > Math.min(limits.maxPromptChars, MAX_PROMPT_CHARS)) {
      fieldErrors.push({ field: 'prompt', message: 'is too long for the selected model' });
    }
    if (request.mode === 'text_to_image' && request.inputAssetId) {
      fieldErrors.push({ field: 'inputAssetId', message: 'text_to_image does not take an input image' });
    }
    if (request.mode !== 'text_to_image' && !request.inputAssetId) {
      fieldErrors.push({ field: 'inputAssetId', message: `${request.mode} requires an input image` });
    }

    let inputSha256: string | null = null;
    if (request.inputAssetId) {
      const asset = await this.prisma.asset.findUnique({ where: { id: request.inputAssetId } });
      if (!asset || asset.ownerId !== principal.id || asset.kind !== 'input' || (asset.expiresAt && asset.expiresAt.getTime() < Date.now())) {
        fieldErrors.push({ field: 'inputAssetId', message: 'not found or expired' });
      } else {
        inputSha256 = asset.sha256;
      }
    }
    if (fieldErrors.length > 0) {
      throw new ApiException(422, 'UNSUPPORTED_CAPABILITY', 'The request uses settings the selected model cannot honor', { fieldErrors });
    }
    return { entry, inputSha256 };
  }

  private async admit(
    options: SubmitOptions,
    validated: Awaited<ReturnType<SubmitGenerationUseCase['validate']>>,
    inputHash: string,
  ): Promise<AdmissionResult> {
    const { principal, idempotencyKey, request, retryOf } = options;
    const { entry } = validated;
    const creditCost = entry.model.creditEstimate[request.quality];

    return this.prisma.$transaction(
      async (tx): Promise<AdmissionResult> => {
        // Serialize admission per studio session. A session is owned by exactly one user.
        const sessions = await tx.$queryRaw<Array<{ latestRevision: number }>>`
          SELECT "latestRevision" FROM "StudioSession"
          WHERE id = ${request.studioSessionId} AND "userId" = ${principal.id} FOR UPDATE`;
        if (sessions.length === 0) throw new ApiException(404, 'NOT_FOUND', 'Studio session not found');
        const latestRevision = sessions[0].latestRevision;

        // Idempotent replay, evaluated after the lock so concurrent duplicates converge.
        const existing = await tx.imageRequest.findUnique({
          where: { userId_idempotencyKey: { userId: principal.id, idempotencyKey: idempotencyKey! } },
          include: { jobs: true },
        });
        if (existing?.jobs[0]) {
          if (existing.inputHash !== inputHash) throw this.conflict();
          return { job: existing.jobs[0], replayed: true, superseded: [] };
        }

        if (retryOf) {
          if (request.clientRevision !== latestRevision) {
            throw new ApiException(409, 'STALE_REVISION', 'The input has changed since this generation; retry the current input instead');
          }
        } else {
          if (request.clientRevision < latestRevision) {
            throw new ApiException(409, 'STALE_REVISION', 'A newer revision of this session was already accepted');
          }
          if (request.clientRevision === latestRevision && latestRevision > 0) {
            const sameRevision = await tx.imageJob.findFirst({
              where: { studioSessionId: request.studioSessionId, clientRevision: request.clientRevision, userId: principal.id },
              include: { request: true },
              orderBy: { createdAt: 'desc' },
            });
            if (sameRevision && sameRevision.request.inputHash === inputHash) {
              return { job: sameRevision, replayed: true, superseded: [] };
            }
            if (sameRevision) throw new ApiException(409, 'STALE_REVISION', 'This revision was already used with different content');
          }
        }

        const interval = minPreviewIntervalMs();
        if (request.intent === 'preview' && interval > 0) {
          const recent = await tx.imageJob.findFirst({
            where: { userId: principal.id, intent: 'preview', createdAt: { gt: new Date(Date.now() - interval) } },
            select: { id: true },
          });
          if (recent) {
            throw new ApiException(429, 'RATE_LIMITED', 'Previews are limited to one every two seconds', {
              retryAfterSeconds: Math.ceil(interval / 1000),
            });
          }
        }

        const superseded = await this.supersedePendingPreviews(tx, request.studioSessionId);

        const openJobs = await tx.imageJob.count({
          where: { userId: principal.id, status: { in: ['PENDING', 'QUEUED', 'PROCESSING'] } },
        });
        if (openJobs >= MAX_NONTERMINAL_PER_USER) {
          throw new ApiException(429, 'RATE_LIMITED', 'Too many unfinished generations; wait for some to complete', { retryAfterSeconds: 5 });
        }

        const jobId = randomUUID();
        const reserved = await this.ledger.reserve(tx, principal.id, jobId, creditCost);
        if (!reserved) {
          const balance = await this.ledger.getBalance(principal.id);
          throw new ApiException(402, 'INSUFFICIENT_CREDITS', `Not enough credits (${balance.available} available, ${creditCost} required)`);
        }

        const payload: JobPayload = {
          modelId: request.modelId,
          mode: request.mode,
          prompt: request.prompt,
          size: request.size,
          quality: request.quality,
          inputAssetId: request.inputAssetId ?? null,
          inputHash,
        };
        const requestRow = await tx.imageRequest.create({
          data: {
            userId: principal.id,
            method: request.mode,
            parameters: payload as unknown as Prisma.InputJsonValue,
            status: 'PENDING',
            idempotencyKey,
            inputHash,
          },
        });
        const job = await tx.imageJob.create({
          data: {
            id: jobId,
            requestId: requestRow.id,
            userId: principal.id,
            studioSessionId: request.studioSessionId,
            clientRevision: request.clientRevision,
            intent: request.intent,
            modelName: request.modelId,
            provider: entry.model.provider,
            status: 'PENDING',
            stateVersion: 1,
            stage: 'queued',
            isSimulated: entry.model.isSimulated,
            creditCost,
            retryOfJobId: retryOf?.id ?? null,
            payload: payload as unknown as Prisma.InputJsonValue,
            expiresAt: new Date(Date.now() + PREVIEW_RETENTION_MS),
          },
        });
        // The dispatch intent commits with the job: a crash before enqueue loses nothing.
        await tx.generationOutbox.create({
          data: {
            jobId,
            eventType: 'job.dispatch',
            payload: { schemaVersion: 1, studioSessionId: request.studioSessionId, intent: request.intent } as Prisma.InputJsonValue,
          },
        });
        await tx.$executeRaw`
          UPDATE "StudioSession" SET "latestRevision" = GREATEST("latestRevision", ${request.clientRevision}), "updatedAt" = now()
          WHERE id = ${request.studioSessionId}`;
        return { job, replayed: false, superseded };
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
  }

  /** A newer input replaces older, not yet started previews of the same session (never a running job or a final). */
  private async supersedePendingPreviews(tx: Tx, studioSessionId: string): Promise<ImageJob[]> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE "ImageJob"
      SET status = 'CANCELLED', "errorCode" = 'SUPERSEDED', "cancelledAt" = now(), "cancellationRequestedAt" = now(),
          "executionFinishedAt" = now(), "stateVersion" = "stateVersion" + 1, "updatedAt" = now()
      WHERE "studioSessionId" = ${studioSessionId} AND intent = 'preview'
        AND status IN ('PENDING', 'QUEUED') AND "attemptId" IS NULL
      RETURNING id`;
    const jobs: ImageJob[] = [];
    for (const { id } of rows) {
      await this.ledger.release(tx, id);
      await tx.generationOutbox.updateMany({ where: { jobId: id, publishedAt: null }, data: { publishedAt: new Date() } });
      const job = await tx.imageJob.findUniqueOrThrow({ where: { id } });
      await tx.imageRequest.update({ where: { id: job.requestId }, data: { status: 'CANCELLED' } });
      jobs.push(job);
    }
    return jobs;
  }

  private publishAfterCommit(result: AdmissionResult, userId: string): void {
    if (result.replayed) return;
    this.notifier.jobUpdated(userId, toUpdatedEvent(result.job, []));
    for (const job of result.superseded) {
      this.notifier.jobUpdated(userId, toUpdatedEvent(job, []));
      void this.queue.remove(job.id).catch((error) => this.logger.warn(`Could not remove superseded job from the queue: ${(error as Error).message}`));
    }
  }
}
