import { AxiosRequestConfig } from 'axios';
import { apiClient } from './api/client';
import { uploadImageWithProgress } from './api/upload';

export { uploadImageWithProgress };

export const uploadImage = async (url: string, file: File, config: AxiosRequestConfig = {}): Promise<unknown> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(url, formData, {
    ...config,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...config.headers,
    },
  });

  return response;
};

const apiService = Object.assign(apiClient, {
  uploadImage,
  uploadImageWithProgress,
});

export default apiService;

