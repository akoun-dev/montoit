import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Agency = Database['public']['Tables']['agencies']['Row'];

export interface UserAgency {
  id: string;
  agency_name: string;
  user_id: string;
  status: string;
}

/**
 * Hook to get the current user's agency
 * Uses direct query with RLS for security
 */
export function useUserAgency() {
  return useQuery({
    queryKey: ['user-agency'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      const agency = data?.[0] as Agency | undefined;

      if (!agency) {
        throw new Error('Agence non trouvée');
      }

      return agency as UserAgency;
    },
    retry: false,
    staleTime: Infinity, // Agency data doesn't change often
  });
}

/**
 * Hook to get agency ID for the current user
 * Returns null if user doesn't have an agency
 */
export function useAgencyId() {
  const { data: agency, isLoading, error } = useUserAgency();
  return {
    agencyId: agency?.id || null,
    isLoading,
    error,
    agency,
  };
}
