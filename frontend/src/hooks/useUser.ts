import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAllUsers, 
  updateUser, 
  getUserById,
  GetUsersQueryParams, 
  UpdateUserDto,
  GetUsersResponse,
  UpdateUserResponse,
  UserListItem
} from '@/features/user';
import { useToast } from '@chakra-ui/react';

// Query key factory
const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: GetUsersQueryParams) => [...userKeys.lists(), params] as const,
};

/**
 * Hook to fetch paginated users list (admin only)
 */
export const useUsers = (params: GetUsersQueryParams = {}) => {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => getAllUsers(params),
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
};

/**
 * Hook to get user by ID (admin only)
 */
export const useUserById = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserById(userId!),
    enabled: !!userId,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook to update user (admin only)
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserDto }) => 
      updateUser(userId, data),
    onSuccess: (response: UpdateUserResponse) => {
      // Invalidate users queries to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: 'Success',
        description: response.message || 'User updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to update user';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
      console.error('Update user error:', error);
    },
  });
};

