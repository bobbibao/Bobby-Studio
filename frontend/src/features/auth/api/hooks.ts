import { authApiClient } from './client';

export const createAuthSession = () => authApiClient.createAuthSession();
export const sendEmailVerification = (language: string) => authApiClient.sendEmailVerification(language);
export const getEmailVerifiedStatus = (userId: string) => authApiClient.getEmailVerifiedStatus(userId);
export const verifyEmail = () => authApiClient.verifyEmail();

