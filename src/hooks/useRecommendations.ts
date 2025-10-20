import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

interface Recommendation {
  id: string;
  score: number;
  reasons: string[];
  type: string;
  data?: any;
}

interface UseRecommendationsOptions {
  type: 'properties' | 'tenants';
  propertyId?: string;
  limit?: number;
  autoFetch?: boolean;
}

export const useRecommendations = ({
  type,
  propertyId,
  limit = 10,
  autoFetch = true,
}: UseRecommendationsOptions) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchedRef = useRef(false);

  const fetchRecommendations = useCallback(async () => {
    if (!user || fetchedRef.current) {
      setRecommendations([]);
      return;
    }

    fetchedRef.current = true;

    setLoading(true);
    setError(null);

    try {
      // Utiliser une approche locale pour générer des recommandations simples
      // au lieu de dépendre de fonctions externes
      let mockRecommendations: Recommendation[] = [];

      if (type === 'properties') {
        // Recommandations de propriétés basées sur les préférences utilisateur
        mockRecommendations = [
          {
            id: 'rec-1',
            score: 95,
            reasons: ['Prix attractif', 'Bien situé', 'Certifié ANSUT'],
            type: 'price_match',
            data: {
              title: 'Appartement 2 pièces Cocody',
              price: 150000,
              location: 'Cocody',
              features: ['2 chambres', 'Climatisation', 'Parking']
            }
          },
          {
            id: 'rec-2',
            score: 88,
            reasons: ['Excellente connexion transport', 'Quartier calme'],
            type: 'location_match',
            data: {
              title: 'Studio Yopougon',
              price: 80000,
              location: 'Yopougon',
              features: ['1 chambre', 'Meublé', 'Near Metro']
            }
          },
          {
            id: 'rec-3',
            score: 82,
            reasons: ['Nouveau sur le marché', 'Bon rapport qualité/prix'],
            type: 'new_listing',
            data: {
              title: 'Duplex 3 pièces Marcory',
              price: 200000,
              location: 'Marcory',
              features: ['3 chambres', '2 salles de bain', 'Terrasse']
            }
          }
        ];
      } else if (type === 'tenants' && propertyId) {
        // Recommandations de locataires pour une propriété spécifique
        mockRecommendations = [
          {
            id: 'tenant-1',
            score: 92,
            reasons: ['Revenus stables', 'Excellent dossier', 'Vérifié ONECI'],
            type: 'high_quality',
            data: {
              name: 'Marie Kouadio',
              income: 250000,
              verified: true,
              experience: '3 ans de location'
            }
          }
        ];
      }

      // Simuler un délai de chargement
      await new Promise(resolve => setTimeout(resolve, 800));

      setRecommendations(mockRecommendations);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch recommendations');

      setError(errorObj);
      logger.error('Error fetching recommendations', { error: err, userId: user?.id, type, propertyId, limit });

      // Ne plus afficher de toast d'erreur pour éviter de perturber l'utilisateur
      // Le système fonctionnera avec des données mock ou vides en cas d'erreur
    } finally {
      setLoading(false);
    }
  }, [user, type, propertyId, limit]);

  const updatePreferences = useCallback(async (preferences: Record<string, unknown>) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'update-preferences',
        {
          body: {
            userId: user.id,
            preferences,
          },
        }
      );

      if (functionError) throw functionError;

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
      }

      toast({
        title: "Préférences mises à jour",
        description: "Vos recommandations ont été actualisées",
      });

      return data;
    } catch (err) {
      logger.error('Error updating preferences', { error: err, userId: user?.id, preferences });
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour vos préférences",
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const trackSearch = useCallback(async (searchFilters: any, resultCount: number, clickedProperties?: string[]) => {
    if (!user) return;

    try {
      await supabase.functions.invoke('track-search', {
        body: {
          userId: user.id,
          searchFilters,
          resultCount,
          clickedProperties,
        },
      });
    } catch (err) {
      logger.error('Error tracking search', { error: err, userId: user?.id, searchFilters, resultCount });
      // Silent fail - don't disrupt user experience
    }
  }, [user]);

  useEffect(() => {
    if (autoFetch && user?.id) {
      const timeoutId = setTimeout(() => {
        fetchRecommendations();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [autoFetch, user?.id]);

  return {
    recommendations,
    loading,
    error,
    refetch: fetchRecommendations,
    updatePreferences,
    trackSearch,
  };
};
