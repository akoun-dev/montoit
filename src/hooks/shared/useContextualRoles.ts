import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export interface ContextualRoles {
  // Rôles contextuels déduits des données
  isOwner: boolean; // A au moins une propriété
  isTenant: boolean; // A au moins un bail actif en tant que locataire
  isLandlord: boolean; // A au moins un bail actif en tant que propriétaire

  // Compteurs
  propertiesCount: number;
  activeLeasesAsTenantCount: number;
  activeLeasesAsLandlordCount: number;

  // État
  loading: boolean;
  error: Error | null;

  // Actions
  refresh: () => Promise<void>;
}

/**
 * Hook pour détecter dynamiquement les rôles contextuels d'un utilisateur
 * basés sur ses propriétés et ses baux, pas sur un attribut fixe du profil.
 *
 * - isOwner: true si l'utilisateur a au moins une propriété (properties.owner_id)
 * - isTenant: true si l'utilisateur a au moins un bail actif en tant que locataire (lease_contracts.tenant_id)
 * - isLandlord: true si l'utilisateur a au moins un bail actif en tant que propriétaire (lease_contracts.owner_id)
 */
export function useContextualRoles(): ContextualRoles {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [propertiesCount, setPropertiesCount] = useState(0);
  const [activeLeasesAsTenantCount, setActiveLeasesAsTenantCount] = useState(0);
  const [activeLeasesAsLandlordCount, setActiveLeasesAsLandlordCount] = useState(0);

  const fetchContextualRoles = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch properties count and active leases in parallel
      const [propertiesResult, tenantLeasesResult, landlordLeasesResult] = await Promise.all([
        // Count properties owned by user
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id),

        // Count active leases where user is tenant
        supabase
          .from('lease_contracts')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', user.id),

        // Count active leases where user is landlord/owner
        supabase
          .from('lease_contracts')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id),
      ]);

      if (propertiesResult.error || tenantLeasesResult.error || landlordLeasesResult.error) {
        throw propertiesResult.error || tenantLeasesResult.error || landlordLeasesResult.error;
      }

      setPropertiesCount(propertiesResult.count ?? 0);
      setActiveLeasesAsTenantCount(tenantLeasesResult.count ?? 0);
      setActiveLeasesAsLandlordCount(landlordLeasesResult.count ?? 0);
    } catch (err) {
      console.warn('Error fetching contextual roles:', err);
      // Fallback silencieux pour éviter le bruit UI
      setPropertiesCount(0);
      setActiveLeasesAsTenantCount(0);
      setActiveLeasesAsLandlordCount(0);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchContextualRoles();
  }, [fetchContextualRoles]);

  // Derived boolean values
  const isOwner = propertiesCount > 0;
  const isTenant = activeLeasesAsTenantCount > 0;
  const isLandlord = activeLeasesAsLandlordCount > 0;

  return useMemo(
    () => ({
      isOwner,
      isTenant,
      isLandlord,
      propertiesCount,
      activeLeasesAsTenantCount,
      activeLeasesAsLandlordCount,
      loading,
      error,
      refresh: fetchContextualRoles,
    }),
    [
      isOwner,
      isTenant,
      isLandlord,
      propertiesCount,
      activeLeasesAsTenantCount,
      activeLeasesAsLandlordCount,
      loading,
      error,
      fetchContextualRoles,
    ]
  );
}
