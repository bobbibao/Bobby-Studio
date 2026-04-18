import { GenerationJob, GenerationRequest } from '../../../domain/generation/generation.entities';
import { GenerationStatus } from '../../../domain/generation/generation-status';

export const GENERATION_REPOSITORY = Symbol('GENERATION_REPOSITORY');

export interface IGenerationRepository {
  createImageRequest(data: {
    userId: string;
    method: string;
    parameters: Record<string, unknown>;
  }): Promise<string>;
  createImageJob(data: {
    jobId: string;
    requestId: string;
    modelName: string;
    provider: string;
    payload?: Record<string, unknown>;
  }): Promise<void>;
  updateImageRequestStatus(data: {
    requestId: string;
    status: GenerationStatus | string;
  }): Promise<void>;
  updateImageJobStatus(data: {
    jobId: string;
    status: GenerationStatus | string;
    error?: string;
  }): Promise<void>;
  getImageRequestById(requestId: string): Promise<GenerationRequest | null>;
  getImageJobById(jobId: string): Promise<GenerationJob | null>;
  getRequestIdFromJobId(jobId: string): Promise<string | null>;
  getStoredJobPayload(jobId: string): Promise<Record<string, unknown> | null>;
  saveImageJobPayload(jobId: string, payload: Record<string, unknown>): Promise<void>;
}
