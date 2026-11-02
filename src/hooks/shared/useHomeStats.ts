import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HomeStats {
  propertiesCount: number;
  tenantsCount: number;
  satisfactionRate: string;
  averageDelay: string;
  virtualVisits: string;
  isLoading: boolean;
}

/**
 * Hook centralisé pour récupérer les statistiques de la page d'accueil
 * Garantit la cohérence des données entre les différentes sections
 */
export function useHomeStats(): HomeStats {
  const [stats, setStats] = useState<HomeStats>({
    propertiesCount: 0,
    tenantsCount: 0,
    satisfactionRate: '98%',
    averageDelay: '48h',
    virtualVisits: '1M+',
    isLoading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Récupérer le nombre de propriétés disponibles
        const { count: propertiesCount } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'disponible');

        // Récupérer le nombre de locataires (profils avec user_type = tenant)
        const { count: tenantsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          // Enum user_type values are French; avoid invalid enums that cause 400
          .eq('user_type', 'locataire');

        setStats({
          propertiesCount: propertiesCount || 0,
          tenantsCount: tenantsCount || 0,
          satisfactionRate: '98%',
          averageDelay: '48h',
          virtualVisits: '1M+',
          isLoading: false,
        });
      } catch (error) {
        console.error('Erreur chargement stats:', error);
        setStats((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, []);

  return stats;
}
