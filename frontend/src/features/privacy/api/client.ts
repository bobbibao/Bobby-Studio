import { apiClient } from '@/services/api/client';
import { PrivacySettingsDto, PrivacySettingsResponseDto } from '@/types/privacy';

export const getPrivacySettings = async () => {
  const response = await apiClient.get<PrivacySettingsResponseDto>('/privacy-settings');
  return response.data;
};

export const updatePrivacySettings = async (data: PrivacySettingsDto) => {
  const response = await apiClient.put<PrivacySettingsResponseDto>('/privacy-settings', data);
  return response.data;
};

