import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getLocalBypassHeaders, getToken, refreshToken } from '@/services/auth/tokenStorage';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export function attachAuthInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use(
    async (config) => {
      const token = await getToken();

      if (token) {
        config.headers.Authorization = config.headers.Authorization || `Bearer ${token}`;
      } else {
        const bypassHeaders = getLocalBypassHeaders();
        config.headers.bypass_api_token = bypassHeaders.bypass_api_token;
        config.headers.bypass_api_user_id = bypassHeaders.bypass_api_user_id;
      }

      return config;
    },
    (error: AxiosError) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetriableRequestConfig | undefined;

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        const token = await refreshToken();

        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        }
      }

      return Promise.reject(error);
    }
  );
}

