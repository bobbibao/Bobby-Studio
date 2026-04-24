import { apiClient } from '@/services/api/client';
import { API_UPLOAD_TIMEOUT } from '@/config/api';
import { SdxlGenerateRequest, SdxlGenerateResponse, SdxlQueueStats } from '../types';
import { SDXL_GENERATION_ENDPOINTS } from './endpoints';

export class SdxlGenerationApiClient {
  async generate(payload: SdxlGenerateRequest, signal?: AbortSignal): Promise<SdxlGenerateResponse> {
    const response = await apiClient.post<SdxlGenerateResponse>(SDXL_GENERATION_ENDPOINTS.GENERATE, payload, {
      signal,
      timeout: API_UPLOAD_TIMEOUT,
    });

    return response.data;
  }

  async getQueueStats(): Promise<SdxlQueueStats> {
    const response = await apiClient.get<SdxlQueueStats>(SDXL_GENERATION_ENDPOINTS.QUEUE_STATS);
    return response.data;
  }
}

export const sdxlGenerationApiClient = new SdxlGenerationApiClient();

