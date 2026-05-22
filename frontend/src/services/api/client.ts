import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/config/api';
import { attachAuthInterceptors } from './auth.interceptor';
import { attachErrorHandler } from './error.handler';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    Accept: '*/*',
  },
});

attachAuthInterceptors(apiClient);
attachErrorHandler(apiClient);

export default apiClient;

