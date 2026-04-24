import apiService from '../services/api';
import { ActionEntity } from '@/common/dtos/attribute/common.dto';

export const ImageAPI = {
  fetchImage: async (imageKey: string, options?: { thumbnail?: boolean; format?: string }): Promise<Blob> => {
    if (!imageKey) {
      throw new Error('Image key is required');
    }
    const { thumbnail = false, format = 'webp' } = options || {};

    const params = new URLSearchParams();
    params.append('thumbnail', thumbnail.toString());
    params.append('format', format);

    try {
      const response = await apiService.get(`/images/${imageKey}?${params.toString()}`, {
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch (error) {
      console.error('Fetch image error:', error);
      throw error;
    }
  },
  fetchAttributeActions: async (attributeId: string, version?: string): Promise<ActionEntity> => {
    const response = await apiService.get(`/attributes/${attributeId}/actions`, {
      params: { version },
    });
    return response.data as ActionEntity;
  },
};

