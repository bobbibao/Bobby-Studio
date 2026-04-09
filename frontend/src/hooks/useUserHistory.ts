import { useQuery } from '@tanstack/react-query';
import {
  getUserImageHistory,
  getUserImageHistoryDetail,
  GetUserImageHistoryQueryParams,
  GetUserImageHistoryResponse,
  UserImageHistoryItem
} from '@/features/user';

// Query key factory
const userHistoryKeys = {
  all: ['user-history'] as const,
  lists: () => [...userHistoryKeys.all, 'list'] as const,
  list: (userId: string, params: GetUserImageHistoryQueryParams) =>
    [...userHistoryKeys.lists(), userId, params] as const,
  details: () => [...userHistoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...userHistoryKeys.details(), id] as const,
};

/**
 * Hook to fetch user image history (admin only)
 */
export const useUserImageHistory = (
  userId: string,
  params: GetUserImageHistoryQueryParams = {}
) => {
  return useQuery({
    queryKey: userHistoryKeys.list(userId, params),
    queryFn: () => getUserImageHistory(userId, params),
    enabled: !!userId, // Only run query if userId is provided
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
};

/**
 * Hook to fetch user image history detail (admin only)
 */
export const useUserImageHistoryDetail = (id: string) => {
  return useQuery({
    queryKey: userHistoryKeys.detail(id),
    queryFn: () => getUserImageHistoryDetail(id),
    enabled: !!id, // Only run query if id is provided
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
};

