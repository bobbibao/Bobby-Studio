import { useQuery } from '@tanstack/react-query';
import { generationKeys } from '../api/keys';
import type { StudioApi } from './types';

/** Server state owned by TanStack Query: the entitled catalog and the credit balance. */
export function useStudioData(userId: string, api: StudioApi) {
  const catalog = useQuery({
    queryKey: generationKeys.catalog(userId),
    queryFn: () => api.getCatalog(),
    staleTime: 60_000,
    retry: 1,
  });
  const balance = useQuery({
    queryKey: generationKeys.balance(userId),
    queryFn: () => api.getCreditBalance(),
    staleTime: 15_000,
    retry: 1,
  });
  return { catalog, balance };
}
