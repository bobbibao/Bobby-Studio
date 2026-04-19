import { authService } from '@/services/auth';

export const authApiClient = {
  createAuthSession: () => authService.createSession(),
  sendEmailVerification: (language: string) => authService.sendEmailVerification(language),
  getEmailVerifiedStatus: (userId: string) => authService.getEmailVerifiedStatus(userId),
  verifyEmail: () => authService.verifyEmail(),
};

