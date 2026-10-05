import { Asset, ImageJob } from '@prisma/client';
import {
  GenerationErrorCode,
  GenerationIntent,
  GenerationSnapshot,
  GenerationUpdatedEvent,
  JobStage,
  JobStatus,
} from './contracts';
import { JobPayload } from './job-payload';

export const ERROR_MESSAGES: Record<GenerationErrorCode, string> = {
  INVALID_INPUT: 'The request could not be processed. Check your input and try again.',
  UNSUPPORTED_CAPABILITY: 'The selected model does not support this combination of settings.',
  PROVIDER_AUTH: 'The image service rejected its credentials. An administrator must fix the configuration.',
  PROVIDER_QUOTA_EXHAUSTED: 'The image service quota is exhausted. Try again later or contact support.',
  PROVIDER_RATE_LIMITED: 'The image service is busy. Please try again shortly.',
  PROVIDER_UNAVAILABLE: 'The image service is temporarily unavailable. Please try again.',
  PROVIDER_OUTCOME_UNKNOWN: 'The image service did not confirm the result, so it was not repeated automatically. You can retry.',
  PROVIDER_MALFORMED_OUTPUT: 'The image service returned an unusable result. Please try again.',
  PROVIDER_NO_IMAGE: 'The image service did not return an image for this request. Adjust the prompt and try again.',
  STORAGE_UNAVAILABLE: 'The result could not be stored. Please try again.',
  DEADLINE_EXCEEDED: 'The generation took too long and was stopped. Please try again.',
  CANCELLED: 'The generation was cancelled.',
  SUPERSEDED: 'A newer version of your input replaced this generation.',
  INTERNAL: 'Something went wrong. Please try again.',
};

export interface SnapshotAsset {
  asset: Asset;
  url: string;
  thumbnailUrl: string | null;
}

const errorOf = (job: ImageJob) =>
  job.errorCode ? { code: job.errorCode as GenerationErrorCode, message: ERROR_MESSAGES[job.errorCode as GenerationErrorCode] ?? ERROR_MESSAGES.INTERNAL } : null;

export function toSnapshot(job: ImageJob, assets: SnapshotAsset[]): GenerationSnapshot {
  const payload = job.payload as unknown as JobPayload;
  return {
    id: job.id,
    requestId: job.requestId,
    studioSessionId: job.studioSessionId,
    clientRevision: job.clientRevision,
    intent: job.intent as GenerationIntent,
    modelId: job.modelName,
    mode: payload.mode,
    size: payload.size,
    quality: payload.quality,
    status: job.status as JobStatus,
    stage: (job.stage as JobStage | null) ?? null,
    stateVersion: job.stateVersion,
    isSimulated: job.isSimulated,
    creditCost: job.creditCost,
    cancellationRequested: job.cancellationRequestedAt !== null,
    error: errorOf(job),
    result:
      job.status === 'COMPLETED'
        ? {
            assets: assets.map(({ asset, url, thumbnailUrl }) => ({
              assetId: asset.id,
              mimeType: asset.mimeType,
              width: asset.width ?? 0,
              height: asset.height ?? 0,
              byteSize: asset.byteSize,
              url,
              thumbnailUrl,
              saved: asset.retention === 'saved',
            })),
          }
        : null,
    retryOfJobId: job.retryOfJobId,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
    expiresAt: job.expiresAt?.toISOString() ?? null,
  };
}

export function toUpdatedEvent(job: ImageJob, assetIds: string[]): GenerationUpdatedEvent {
  return {
    schemaVersion: 1,
    jobId: job.id,
    studioSessionId: job.studioSessionId,
    clientRevision: job.clientRevision,
    stateVersion: job.stateVersion,
    status: job.status as JobStatus,
    stage: (job.stage as JobStage | null) ?? null,
    error: errorOf(job),
    assetIds,
  };
}
