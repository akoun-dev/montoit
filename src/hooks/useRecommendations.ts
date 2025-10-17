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
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-recommendations',
        {
          body: {
            userId: user.id,
            type,
            propertyId,
            limit,
          },
        }
      );

      if (functionError) throw functionError;

      setRecommendations(data || []);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch recommendations');
      setError(errorObj);
      logger.error('Error fetching recommendations', { error: err, userId: user?.id, type, propertyId, limit });
      toast({
        title: "Erreur",
        description: "Impossible de charger les recommandations",
        variant: "destructive",
      });
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
