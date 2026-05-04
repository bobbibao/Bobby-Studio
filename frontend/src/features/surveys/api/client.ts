import { apiClient } from '@/services/api/client';

export const submitSurvey = async (survey: object) => {
  const response = await apiClient.post('/user-surveys', { survey });
  return response.data;
};

export const clear = async () => {
  const response = await apiClient.post('/user-surveys/clear', {});
  return response.data;
};

