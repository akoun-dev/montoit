import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { callEdgeFunction } from '@/api/client';

export function useMapboxToken() {
  // Local/public fallback so we are resilient when the edge function is down
  const envToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ['mapbox-token'],
    enabled: !envToken, // skip network call if we already have the token locally
    queryFn: async () => {
      const { data, error } = await callEdgeFunction(
        'get-mapbox-token',
        {},
        {
          maxRetries: 2,
          timeout: 15000,
        }
      );

      if (error) {
        console.error('Failed to fetch Mapbox token:', error);
        throw error;
      }

      if (!data?.token) {
        throw new Error('No token returned');
      }

      return (data as any).token as string;
    },
    staleTime: Infinity, // Token stable, pas besoin de refetch
    gcTime: Infinity, // Garder en cache indéfiniment
    retry: 2,
  });

  return {
    token: envToken || data,
    isLoading: envToken ? false : isLoading,
    error: envToken ? null : (error as Error | null),
  };
}
