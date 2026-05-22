import { apiClient } from '@/services/api/client';

export const authService = {
  createSession: async () => {
    const response = await apiClient.post('/auth/session', {});
    return response.data;
  },

  sendEmailVerification: async (language: string): Promise<void> => {
    await apiClient.get(`/auth/email-verify?language=${language}`);
  },

  getEmailVerifiedStatus: async (userId: string): Promise<boolean | null> => {
    const response = await apiClient.get<{ emailVerified: boolean }>(`/user/email-verified-status/${userId}`);
    return response.data.emailVerified;
  },

  verifyEmail: async (): Promise<boolean> => {
    await apiClient.put('/users/email-verify', {});
    return true;
  },

  getCurrentUser: async <TUser = unknown>(): Promise<TUser> => {
    const response = await apiClient.get<TUser>('/role/me');
    return response.data;
  },
};

