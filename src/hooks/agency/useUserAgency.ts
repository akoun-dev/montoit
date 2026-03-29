import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type AgencyProfile = {
  id: string;
  agency_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  agency_logo: string | null;
  user_type: string;
};

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
        .from('profiles')
        .select('id, agency_name, email, phone, city, agency_logo, user_type')
        .eq('id', user.id)
        .eq('user_type', 'agency')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error('Agence non trouvée');
      }

      return {
        id: data.id,
        agency_name: data.agency_name || '',
        user_id: data.id,
        status: 'active',
      } as UserAgency;
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
