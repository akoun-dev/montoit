import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';

export interface UserAgency {
  id: string;
  agency_name: string;
  user_id: string;
  status: string;
}

/**
 * Hook to get the current user's agency
 * Uses RPC function that bypasses RLS for security
 */
export function useUserAgency() {
  const user = supabase.auth.getUser();

  return useQuery({
    queryKey: ['user-agency'],
    queryFn: async () => {
      const { data: userData } = await user;
      if (!userData.data.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .rpc('get_user_agency', {
          user_uuid: userData.data.user.id
        });

      if (error) throw error;

      const agency = data?.[0] as UserAgency | undefined;

      if (!agency) {
        throw new Error('Agence non trouvée');
      }

      return agency;
    },
    enabled: !!user.data.user,
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
