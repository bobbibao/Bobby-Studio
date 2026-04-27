import { apiClient } from '@/services/api/client';
import { PromptEnhancementRequest, PromptEnhancementResponse } from '@/types/generate';

export const getEnhancedPrompt = async (request: PromptEnhancementRequest): Promise<PromptEnhancementResponse> => {
  const response = await apiClient.post<PromptEnhancementResponse>('/prompt-enhancement/enhance', request);
  return response.data;
};

