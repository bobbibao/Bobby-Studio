import { apiClient } from '@/services/api/client';
import { VizPointsDto } from '@/features/admin/pages/admin/profile/types/VizPoints.dto';

export const getAll = async (): Promise<VizPointsDto> => {
  const response = await apiClient.get<VizPointsDto>('/vizpoint');
  return response.data;
};

