import { AxiosRequestConfig } from 'axios';
import { apiClient } from './client';
import { uploadImageWithProgress } from './upload';

export const get = async <T>(url: string, config: AxiosRequestConfig = {}): Promise<T> => {
  const response = await apiClient.get<T>(url, config);
  return response.data;
};

export const post = async <T>(url: string, data: unknown, config: AxiosRequestConfig = {}): Promise<T> => {
  const response = await apiClient.post<T>(url, data, config);
  return response.data;
};

export const put = async <T>(url: string, data: unknown, config: AxiosRequestConfig = {}): Promise<T> => {
  const response = await apiClient.put<T>(url, data, config);
  return response.data;
};

export const patch = async <T>(url: string, data: unknown, config: AxiosRequestConfig = {}): Promise<T> => {
  const response = await apiClient.patch<T>(url, data, config);
  return response.data;
};

export const del = async <T>(url: string, config: AxiosRequestConfig = {}): Promise<T> => {
  const response = await apiClient.delete<T>(url, config);
  return response.data;
};

export const uploadImage = async (url: string, file: File): Promise<unknown> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

const dataApiClient = {
  get,
  post,
  put,
  patch,
  delete: del,
  uploadImage,
  uploadImageWithProgress,
};

export default dataApiClient;

