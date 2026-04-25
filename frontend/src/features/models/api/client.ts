import { apiClient } from '@/services/api/client';
import { ModelsResponse } from '@/types/modelCatalog';

export const getModels = async (): Promise<ModelsResponse> => {
  const response = await apiClient.get<ModelsResponse>('/models');
  return response.data;
};

