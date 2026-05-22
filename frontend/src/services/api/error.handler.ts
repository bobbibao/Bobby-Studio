import type { AxiosError, AxiosInstance } from 'axios';
import { useOutOfPointsModal } from '@/hooks/useOutOfPointsModal';

export function attachErrorHandler(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 402) {
        const { openModal } = useOutOfPointsModal.getState();
        openModal(0);
      }

      return Promise.reject(error);
    }
  );
}

export function getApiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  const axiosError = error as AxiosError<{ message?: string }>;

  return axiosError.response?.data?.message || axiosError.message || fallback;
}

