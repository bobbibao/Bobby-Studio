import { useQuery } from '@tanstack/react-query';
import { sdxlGenerationApiClient } from './client';

export const SDXL_GENERATION_QUERY_KEY = 'sdxl-generation';

export function useSdxlQueueStats() {
  return useQuery({
    queryKey: [SDXL_GENERATION_QUERY_KEY, 'queue-stats'],
    queryFn: () => sdxlGenerationApiClient.getQueueStats(),
    refetchInterval: 15000,
    retry: false,
  });
}

