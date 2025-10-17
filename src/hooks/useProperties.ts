import { useQuery } from '@tanstack/react-query';
import { propertyService } from '@/services/propertyService';
import type { SearchFilters } from '@/types';

/**
 * Hook to fetch all properties with optional filters using TanStack Query
 */
export const useProperties = (filters?: SearchFilters & { currentUserId?: string }) => {
  return useQuery({
    queryKey: ['properties', filters],
    queryFn: () => propertyService.fetchAll(filters),
    staleTime: 60_000, // 1 minute
    retry: 2,
  });
};

/**
 * Hook to fetch properties by owner ID using TanStack Query
 */
export const useOwnerProperties = (ownerId: string) => {
  return useQuery({
    queryKey: ['properties', 'owner', ownerId],
    queryFn: () => propertyService.fetchByOwner(ownerId),
    staleTime: 30_000, // 30 seconds
    enabled: !!ownerId,
  });
};
