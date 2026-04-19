import { apiClient } from '@/services/api/client';
import { BillingHistoryResponse } from '@/types/billing';
import Stripe from 'stripe';
import { UsageStatisticsDto } from '@/features/admin/pages/admin/profile/types/UsageStatistics.dto';
import CheckPaymentMethodResponse from '@/features/admin/pages/admin/profile/types/checkPaymentMethodResponse.dto';
import { SubscriptionResponseDtoV2 } from '@/features/admin/pages/admin/profile/types/subscriptionResponse.dto';
import { CancelSubscriptionResponseDto } from '@/features/admin/pages/admin/profile/types/cancelSubscriptionResponse.dto';
import { UpgradeSubscriptionResponseDto } from '@/features/admin/pages/admin/profile/types/upgradeSubscriptionResponse.dto';
import { StripePricingResponseDTO } from '@/features/admin/pages/admin/profile/types/stripePricingResponse.dto';

export interface GetUsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  filter?: 'free' | 'basic' | 'pro' | 'team';
  sort?: string;
  role?: string;
  isActive?: string;
  isAdmin?: string;
  emailVerified?: string;
}

export interface UserListItem {
  id: string;
  email: string;
  createdAt: string;
  lastLogin: string | null;
  role: string;
  isAdmin: boolean;
  isActive: boolean;
  emailVerified: boolean;
  freeCredit: number;
  usedFreeCredit: number;
  paidCredit: number;
  usedPaidCredit: number;
}

export interface GetUsersResponse {
  users: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateUserDto {
  freeCredit?: number;
  paidCredit?: number;
  isAdmin?: boolean;
  isActive?: boolean;
}

export interface UpdateUserResponse {
  success: boolean;
  message: string;
  updatedFields: string[];
}

export interface GetUserImageHistoryQueryParams {
  inputType?: 'edit' | 'generate';
  method?: string;
  resolution?: '1K' | '2K' | '4K';
  aspectRatio?: string;
  selectedEditingModels?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface UserImageHistoryItem {
  id: string;
  userId: string;
  inputType: 'edit' | 'generate';
  method?: string;
  modelName?: string[];
  resolution?: string;
  aspectRatio?: string;
  selectedEditingModels?: string[];
  batchEditId?: string | null;
  jobId?: string;
  createdAt: string;
}

export interface GetUserImageHistoryResponse {
  data: UserImageHistoryItem[];
  total: number;
}

interface UpgradeSubscriptionResponse {
  url: string;
}

interface AttachStripeCustomerToUserResponse {
  customerId: string;
}

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const userApiClient = {
  getCurrentUser: async <TUser = unknown>(): Promise<TUser> => {
    const response = await apiClient.get<TUser>('/role/me');
    return response.data;
  },

  updateProfile: async <TResponse = unknown>(data: object): Promise<TResponse> => {
    const response = await apiClient.put<TResponse>('/users/profile', data);
    return response.data;
  },

  updateCompanyProfile: async <TResponse = unknown>(data: object): Promise<TResponse> => {
    const response = await apiClient.put<TResponse>('/users/company', data);
    return response.data;
  },

  getProfile: async <TResponse = unknown>(): Promise<TResponse> => {
    const response = await apiClient.get<TResponse>('/users/profile');
    return response.data;
  },

  getCompanyProfile: async <TResponse = unknown>(): Promise<TResponse> => {
    const response = await apiClient.get<TResponse>('/users/company');
    return response.data;
  },

  deleteAccount: async <TResponse = unknown>(): Promise<TResponse> => {
    const response = await apiClient.delete<TResponse>('/users/profile');
    return response.data;
  },

  isUserActive: async (): Promise<{ isActive: boolean }> => {
    const response = await apiClient.get<{ isActive: boolean }>('/users/active');
    return response.data;
  },

  getUsageStatistics: async (): Promise<UsageStatisticsDto> => {
    const response = await apiClient.get<UsageStatisticsDto>('/usage/stats');
    return response.data;
  },

  attachStripeCustomerToUser: async <TResponse = unknown>(): Promise<TResponse> => {
    const response = await apiClient.post<TResponse>('/users/attach-stripe', []);
    return response.data;
  },

  getPrices: async (): Promise<{ monthly: StripePricingResponseDTO[]; yearly: StripePricingResponseDTO[] }> => {
    const response = await apiClient.get<{ monthly: StripePricingResponseDTO[]; yearly: StripePricingResponseDTO[] }>(
      '/subscription/prices'
    );
    return response.data;
  },

  getPrice: async (priceId: string): Promise<Stripe.Price> => {
    const response = await apiClient.get<Stripe.Price>(`/subscription/prices/${priceId}`);
    return response.data;
  },

  upgradeSubscription: async (
    priceId: string,
    plan: 'monthly' | 'annually' | undefined = undefined
  ): Promise<UpgradeSubscriptionResponse> => {
    const response = await apiClient.post<UpgradeSubscriptionResponse>('/subscription/create-subscription-session', { priceId, plan });
    return response.data;
  },

  attachStripeCustomerToCurrentUser: async (): Promise<AttachStripeCustomerToUserResponse> => {
    const response = await apiClient.post<AttachStripeCustomerToUserResponse>('/subscription/attach-stripe', {});
    return response.data;
  },

  createStripeSubscription: async (
    paymentMethodId: string,
    priceId: string
  ): Promise<AttachStripeCustomerToUserResponse> => {
    const response = await apiClient.post<AttachStripeCustomerToUserResponse>('/subscription/create-stripe-subscriptions', {
      priceId,
      paymentMethodId,
    });
    return response.data;
  },

  checkPaymentMethod: async (customerId: string): Promise<CheckPaymentMethodResponse> => {
    const response = await apiClient.get<CheckPaymentMethodResponse>(
      `/subscription/check-payment-method?customerId=${customerId}`
    );
    return response.data;
  },

  getBillingHistory: async ({
    page,
    pageSize,
    startingAfter,
  }: {
    page: number;
    pageSize: number;
    startingAfter?: string;
  }): Promise<BillingHistoryResponse> => {
    let url = `/subscription/billing-history?page=${page}&pageSize=${pageSize}`;
    if (startingAfter) {
      url += `&startingAfter=${startingAfter}`;
    }
    const response = await apiClient.get<BillingHistoryResponse>(url);
    return response.data;
  },

  getCurrentSubscription: async (): Promise<SubscriptionResponseDtoV2> => {
    const response = await apiClient.get<SubscriptionResponseDtoV2>('/subscription/current');
    return response.data;
  },

  cancelSubscription: async (): Promise<CancelSubscriptionResponseDto> => {
    const response = await apiClient.post<CancelSubscriptionResponseDto>('/subscription/cancel', {});
    return response.data;
  },

  updateSubscriptionPlan: async (priceId: string): Promise<UpgradeSubscriptionResponseDto> => {
    const response = await apiClient.post<UpgradeSubscriptionResponseDto>('/subscription/upgrade', { priceId });
    return response.data;
  },

  verifyEmail: async (): Promise<unknown> => {
    const response = await apiClient.put('/users/email-verify', {});
    return response.data;
  },

  getAllUsers: async (params: GetUsersQueryParams): Promise<GetUsersResponse> => {
    const url = `/admin/users${toQueryString(params as Record<string, string | number | undefined>)}`;
    const response = await apiClient.get<GetUsersResponse>(url);
    return response.data;
  },

  exportUsersCSV: async (params: GetUsersQueryParams = {}): Promise<Blob> => {
    const url = `/admin/users/export/csv${toQueryString(params as Record<string, string | number | undefined>)}`;
    const response = await apiClient.get<Blob>(url, { responseType: 'blob' });
    return response.data;
  },

  downloadUsersCSV: async (params: GetUsersQueryParams = {}, filename = 'list-of-users.csv') => {
    const blob = await userApiClient.exportUsersCSV(params);
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  updateUser: async (userId: string, data: UpdateUserDto): Promise<UpdateUserResponse> => {
    const response = await apiClient.put<UpdateUserResponse>(`/admin/users/${userId}`, data);
    return response.data;
  },

  getUserImageHistory: async (
    userId: string,
    params: GetUserImageHistoryQueryParams = {}
  ): Promise<GetUserImageHistoryResponse> => {
    const url = `/admin/history/${userId}${toQueryString(params as Record<string, string | number | undefined>)}`;
    const response = await apiClient.get<GetUserImageHistoryResponse>(url);
    return response.data;
  },

  getUserImageHistoryDetail: async (id: string): Promise<UserImageHistoryItem> => {
    const response = await apiClient.get<UserImageHistoryItem>(`/admin/detail-history/${id}`);
    return response.data;
  },

  getUserById: async (userId: string): Promise<UserListItem> => {
    const response = await apiClient.get<UserListItem>(`/admin/users/${userId}`);
    return response.data;
  },
};

export const getCurrentUser = userApiClient.getCurrentUser;
export const updateProfile = userApiClient.updateProfile;
export const updateCompanyProfile = userApiClient.updateCompanyProfile;
export const getProfile = userApiClient.getProfile;
export const getCompanyProfile = userApiClient.getCompanyProfile;
export const deleteAccount = userApiClient.deleteAccount;
export const isUserActive = userApiClient.isUserActive;
export const getUsageStatistics = userApiClient.getUsageStatistics;
export const attachStripeCustomerToUser = userApiClient.attachStripeCustomerToUser;
export const getPrices = userApiClient.getPrices;
export const getPrice = userApiClient.getPrice;
export const upgradeSubscription = userApiClient.upgradeSubscription;
export const attachStripeCustomerToCurrentUser = userApiClient.attachStripeCustomerToCurrentUser;
export const createStripeSubscription = userApiClient.createStripeSubscription;
export const checkPaymentMethod = userApiClient.checkPaymentMethod;
export const getBillingHistory = userApiClient.getBillingHistory;
export const getCurrentSubscription = userApiClient.getCurrentSubscription;
export const cancelSubscription = userApiClient.cancelSubscription;
export const updateSubscriptionPlan = userApiClient.updateSubscriptionPlan;
export const verifyEmail = userApiClient.verifyEmail;
export const getAllUsers = userApiClient.getAllUsers;
export const exportUsersCSV = userApiClient.exportUsersCSV;
export const downloadUsersCSV = userApiClient.downloadUsersCSV;
export const updateUser = userApiClient.updateUser;
export const getUserImageHistory = userApiClient.getUserImageHistory;
export const getUserImageHistoryDetail = userApiClient.getUserImageHistoryDetail;
export const getUserById = userApiClient.getUserById;

