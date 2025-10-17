import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useAgencyMandates } from './useAgencyMandates';

/**
 * Hook pour récupérer les biens gérés par une agence
 * Combine les biens sous mandats spécifiques ET globaux
 */
export const useAgencyProperties = () => {
  const { user, profile } = useAuth();
  const { activeMandates, asAgency } = useAgencyMandates();

  const isAgency = profile?.user_type === 'agence';

  const { data: managedProperties = [], isLoading } = useQuery({
    queryKey: ['agency-properties', user?.id, activeMandates],
    queryFn: async () => {
      if (!user || !isAgency || asAgency.length === 0) return [];

      // Récupérer les IDs de propriétaires avec mandats actifs
      const ownerIds = [...new Set(asAgency.map(m => m.owner_id))];
      
      // Récupérer toutes les propriétés des propriétaires avec mandats
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .in('owner_id', ownerIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrer côté client pour ne garder que les biens autorisés
      return (data || []).filter(property => {
        // Vérifier si mandat global OU mandat spécifique pour ce bien
        return asAgency.some(mandate =>
          mandate.status === 'active' &&
          mandate.owner_id === property.owner_id &&
          (mandate.property_id === null || mandate.property_id === property.id)
        );
      });
    },
    enabled: isAgency && asAgency.length > 0,
  });

  // Grouper par propriétaire
  const propertiesByOwner = managedProperties.reduce((acc, property) => {
    const ownerId = property.owner_id;
    if (!acc[ownerId]) {
      acc[ownerId] = [];
    }
    acc[ownerId].push(property);
    return acc;
  }, {} as Record<string, typeof managedProperties>);

  // Statistiques
  const stats = {
    totalProperties: managedProperties.length,
    totalOwners: Object.keys(propertiesByOwner).length,
    availableProperties: managedProperties.filter(p => p.status === 'disponible').length,
    rentedProperties: managedProperties.filter(p => p.status === 'loue').length,
  };

  return {
    managedProperties,
    propertiesByOwner,
    stats,
    isLoading,
    isAgency,
  };
};
