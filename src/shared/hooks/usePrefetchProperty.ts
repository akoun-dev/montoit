/**
 * usePrefetchProperty - Précharge les données de propriété pour améliorer la navigation
 *
 * Utilisation:
 * 1. prefetchProperty() - Précharge immédiatement les données
 * 2. usePrefetchOnHover() - Retourne des handlers pour précharger au survol/focus
 */

import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys, propertyDetailConfig } from '@/shared/lib/query-config';
import type { Database } from '@/integrations/supabase/types';

type Property = Database['public']['Tables']['properties']['Row'];
type PropertyWithOwner = Property & {
  owner_trust_score?: number | null;
  owner_full_name?: string | null;
  owner_is_verified?: boolean | null;
};

/**
 * Fetch a single property with owner data
 */
async function fetchProperty(id: string): Promise<PropertyWithOwner | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('status', 'disponible')
    .single();

  if (error || !data) {
    return null;
  }

  // Fetch owner data if owner_id exists
  let ownerData = null;
  if (data.owner_id) {
    const { data: profilesData } = await supabase.rpc('get_public_profiles', {
      profile_user_ids: [data.owner_id],
    });

    if (profilesData && profilesData.length > 0) {
      ownerData = profilesData[0];
    }
  }

  return {
    ...data,
    owner_trust_score: ownerData?.trust_score ?? null,
    owner_full_name: ownerData?.full_name ?? null,
    owner_is_verified: ownerData?.is_verified ?? null,
  };
}

/**
 * Hook pour précharger les données de propriété
 */
export function usePrefetchProperty() {
  const queryClient = useQueryClient();

  /**
   * Précharge immédiatement une propriété
   */
  const prefetchProperty = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.properties.detail(id),
      queryFn: () => fetchProperty(id),
      ...propertyDetailConfig,
    });
  };

  /**
   * Retourne des handlers pour précharger au survol/focus
   */
  const usePrefetchOnHover = (id: string) => {
    return {
      onMouseEnter: () => prefetchProperty(id),
      onFocus: () => prefetchProperty(id),
    };
  };

  return {
    prefetchProperty,
    usePrefetchOnHover,
  };
}

/**
 * Hook pour précharger une liste de propriétés (ex: pages adjacentes)
 */
export function usePrefetchProperties() {
  const queryClient = useQueryClient();

  /**
   * Précharge plusieurs propriétés
   */
  const prefetchProperties = (ids: string[]) => {
    ids.forEach((id) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.properties.detail(id),
        queryFn: () => fetchProperty(id),
        ...propertyDetailConfig,
      });
    });
  };

  return {
    prefetchProperties,
  };
}
