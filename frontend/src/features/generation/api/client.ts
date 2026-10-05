import { apiClient } from '@/services/api/client';
import type {
  CatalogResponse,
  CreateGenerationRequest,
  CreditBalance,
  GenerationAccepted,
  GenerationPage,
  GenerationSnapshot,
  SaveGenerationResponse,
  StudioSessionResponse,
  UploadResponse,
} from '../contracts';
import { GENERATION_ENDPOINTS } from './endpoints';

const SUBMIT_TIMEOUT_MS = 20000;
const UPLOAD_TIMEOUT_MS = 60000;

/** Named client for the Bobby Studio generation API. Authentication is attached by `apiClient`. */
export class GenerationApiClient {
  async getCatalog(): Promise<CatalogResponse> {
    const response = await apiClient.get<CatalogResponse>(GENERATION_ENDPOINTS.MODELS);
    return response.data;
  }

  async getCreditBalance(): Promise<CreditBalance> {
    const response = await apiClient.get<CreditBalance>(GENERATION_ENDPOINTS.CREDIT_BALANCE);
    return response.data;
  }

  async createStudioSession(): Promise<StudioSessionResponse> {
    const response = await apiClient.post<StudioSessionResponse>(GENERATION_ENDPOINTS.STUDIO_SESSIONS);
    return response.data;
  }

  async uploadImage(file: File, signal?: AbortSignal): Promise<UploadResponse> {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post<UploadResponse>(GENERATION_ENDPOINTS.UPLOADS, form, {
      signal,
      timeout: UPLOAD_TIMEOUT_MS,
    });
    return response.data;
  }

  /**
   * Submits a generation. The Idempotency-Key is created once per submit intent by the caller; a timed-out
   * or lost request must be replayed with the same key.
   */
  async createGeneration(body: CreateGenerationRequest, idempotencyKey: string): Promise<GenerationAccepted> {
    const response = await apiClient.post<GenerationAccepted>(GENERATION_ENDPOINTS.GENERATIONS, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
      timeout: SUBMIT_TIMEOUT_MS,
    });
    return response.data;
  }

  async getGeneration(id: string): Promise<GenerationSnapshot> {
    const response = await apiClient.get<GenerationSnapshot>(GENERATION_ENDPOINTS.generation(id));
    return response.data;
  }

  async listGenerations(params: { cursor?: string | null; limit?: number } = {}): Promise<GenerationPage> {
    const response = await apiClient.get<GenerationPage>(GENERATION_ENDPOINTS.GENERATIONS, {
      params: { cursor: params.cursor ?? undefined, limit: params.limit },
    });
    return response.data;
  }

  /** Logical cancellation of a job. Aborting a browser request never does this. */
  async cancelGeneration(id: string): Promise<GenerationSnapshot> {
    const response = await apiClient.post<GenerationSnapshot>(GENERATION_ENDPOINTS.cancel(id));
    return response.data;
  }

  async retryGeneration(id: string, idempotencyKey: string): Promise<GenerationAccepted> {
    const response = await apiClient.post<GenerationAccepted>(GENERATION_ENDPOINTS.retry(id), undefined, {
      headers: { 'Idempotency-Key': idempotencyKey },
      timeout: SUBMIT_TIMEOUT_MS,
    });
    return response.data;
  }

  async saveGeneration(id: string): Promise<SaveGenerationResponse> {
    const response = await apiClient.post<SaveGenerationResponse>(GENERATION_ENDPOINTS.save(id));
    return response.data;
  }

  /** Authorized image bytes for an owned asset, used to show a reference after a reload. */
  async getAssetBlob(assetId: string, signal?: AbortSignal): Promise<Blob> {
    const response = await apiClient.get<Blob>(GENERATION_ENDPOINTS.asset(assetId), { responseType: 'blob', signal });
    return response.data;
  }
}

export const generationApiClient = new GenerationApiClient();

/** Downloads a (short-lived, signed) result URL as a Blob so the browser can save it under a chosen name. */
export async function fetchImageBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Image download failed with status ${response.status}`);
  }
  return response.blob();
}
