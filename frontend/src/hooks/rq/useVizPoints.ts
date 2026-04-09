import { useQuery } from '@tanstack/react-query';
import * as vizpointAPI from '@/features/vizpoint';

export const useVizPoints = (isOpen: boolean) => {
  return useQuery({
    queryKey: ['vizPoints'],
    queryFn: vizpointAPI.getAll,
    enabled: isOpen, // Chỉ fetch khi menu mở
    // staleTime: 2000, // 2s -> nếu muốn Cache 5 phút: 1000 * 60 * 5
    staleTime: Infinity,
  });
};

