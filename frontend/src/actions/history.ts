import apiService from '../services/api';
import { apiClient } from '@/services/api/client';

export interface HistoryJobDto {
  jobId: string;
  creationType: string;
  inputType: string;
  status: string;
  progress: number;
  imageKey: string;
  dimensions: string;
  uploadImage?: string;
  selectedStyle: string;
  inputValue: number;
  creativityValue: number;
  styleValue: number;
  seed: string;
  prompt: string;
  enhancedPrompt: string;
  enabledAiPrompt: boolean;
  createdAt: string;
  isPublished?: boolean;
  isFavorite?: boolean;
  isBookmarked?: boolean;
  userId: string;
  version?: string;
  actions?: any;
  path?: string;
  thumbnail?: string;
  method: string;
  requestId: string;
  numImages?: number;
  jobIds?: string[]; // All job IDs for this request (for multi-model generations)
  selectedModels?: string[]; // Models selected for generation
  modelId?: string;
  batchEditId?: string | null; // Batch ID for grouping related edits
  editVersionNumber?: number; // Version number within the batch (1-based)
}

export interface HistoryJobResponse {
  data: HistoryJobDto[];
  total: number;
}

export const getGenerationHistory = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  includeEditImages: boolean = true
): Promise<HistoryJobResponse> => {
  const response = await apiClient.get<HistoryJobResponse>(`/attributes/history/${userId}`, {
    params: { page, limit, includeEditImages },
  });
  return response.data;
};

export const HistoryAPI = {
  getHistoryJobs: async (userId: string, params: any): Promise<HistoryJobResponse> => {
    try {
      if (!userId) {
        throw new Error('User ID is required to fetch history jobs');
      }

      const searchParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v));
        } else if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value);
        }
      });
      const response = await apiService.get(`/attributes/history/${userId}?${searchParams}`);
      return response.data as HistoryJobResponse;
    } catch (error) {
      console.error('Fetch history jobs error:', error);
      throw error;
    }
  },

  getEditImageHistory: async (userId: string, params: any): Promise<HistoryJobResponse> => {
    try {
      if (!userId) {
        throw new Error('User ID is required to fetch edit image history');
      }

      const searchParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v));
        } else if (value !== undefined && value !== null && value !== '') {
          // Skip data URLs (base64 images) as they're too long for query parameters
          // If imageId is a data URL, we'll skip it to avoid ERR_CONNECTION_RESET
          if (key === 'imageId' && typeof value === 'string' && value.startsWith('data:')) {
            // Skip data URLs - they're too long for query parameters
            // The backend should handle requests without imageId or with a shorter identifier
            return; // Skip this parameter
          }
          // Limit imageId length to prevent URL length issues (max ~2000 chars for safety)
          if (key === 'imageId' && typeof value === 'string' && value.length > 2000) {
            console.warn('imageId is too long, truncating to prevent URL length issues');
            searchParams.append(key, value.substring(0, 2000));
            return; // Skip appending the full value
          }
          searchParams.append(key, value);
        }
      });
      const response = await apiService.get(`/attributes/edit-history/${userId}?${searchParams}`);
      return response.data as HistoryJobResponse;
    } catch (error) {
      console.error('Fetch edit image history error:', error);
      throw error;
    }
  },

  getCurrentJobs: async (userId: string, params: any): Promise<any> => {
    try {
      if (!userId) {
        throw new Error('User ID is required to fetch current jobs');
      }

      const searchParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v));
        } else if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value);
        }
      });
      const response = await apiService.get(`/image-generation/user/${userId}/jobs?${searchParams}`);
      return response;
    } catch (error) {
      console.error('Fetch current jobs error:', error);
      throw error;
    }
  },
};

