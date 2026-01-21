/**
 * Hook pour le chargement infini de propriétés avec pagination et cache
 *
 * Fonctionnalités :
 * - Infinite scroll automatique
 * - Cache localStorage avec TTL
 * - Préchargement des pages suivantes
 * - Gestion optimiste des données
 * - Support des filtres
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase/client';
import type { Database } from '@/shared/lib/database.types';
import { cacheService } from '@/shared/services/cacheService';
import { enrichPropertiesWithOwners } from '@/features/property/services/property.api';

type Property = Database['public']['Tables']['properties']['Row'];

interface UseInfinitePropertiesOptions {
  pageSize?: number;
  enabled?: boolean;
  filters?: {
    city?: string;
    propertyType?: string;
    propertyCategory?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    isFurnished?: boolean | null;
    hasParking?: boolean | null;
    hasAC?: boolean | null;
  };
  cacheTTL?: number; // en minutes
  enableCache?: boolean;
}

interface UseInfinitePropertiesReturn {
  properties: Property[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  total: number | null;
  currentPage: number;
  totalPages: number;
  isLoadingMore: boolean;
}

export function useInfiniteProperties(
  options: UseInfinitePropertiesOptions = {}
): UseInfinitePropertiesReturn {
  const { pageSize = 20, enabled = true, filters = {}, cacheTTL = 5, enableCache = true } = options;

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Générer une clé de cache basée sur les filtres
  const getCacheKey = useCallback(
    (page: number) => {
      const filterKey = JSON.stringify(filters);
      return `properties_page_${page}_${filterKey}`;
    },
    [filters]
  );

  // Charger le count total (uniquement propriétés avec propriétaire vérifié)
  const loadTotal = useCallback(async () => {
    try {
      // Récupérer les IDs des profils vérifiés
      const { data: verifiedProfiles, error: profilesError } = await supabase
        .from('public_profiles_view')
        .select('id')
        .eq('is_verified', true);

      if (profilesError) throw profilesError;

      const verifiedOwnerIds = verifiedProfiles?.map((p) => p.id) || [];
      if (verifiedOwnerIds.length === 0) {
        setTotal(0);
        return;
      }

      let query = supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'disponible')
        .in('owner_id', verifiedOwnerIds);

      // Appliquer les filtres
      if (filters.propertyCategory) {
        query = query.eq('property_category', filters.propertyCategory);
      } else {
        query = query.eq('property_category', 'residentiel');
      }

      if (filters.city) {
        query = query.or(`city.ilike.%${filters.city}%,neighborhood.ilike.%${filters.city}%`);
      }

      if (filters.propertyType) {
        query = query.eq('property_type', filters.propertyType);
      }

      if (filters.minPrice) {
        query = query.gte('monthly_rent', filters.minPrice);
      }

      if (filters.maxPrice) {
        query = query.lte('monthly_rent', filters.maxPrice);
      }

      if (filters.bedrooms) {
        query = query.gte('bedrooms', filters.bedrooms);
      }

      if (filters.bathrooms) {
        query = query.gte('bathrooms', filters.bathrooms);
      }

      if (filters.isFurnished !== null && filters.isFurnished !== undefined) {
        query = query.eq('furnished', filters.isFurnished);
      }

      if (filters.hasParking !== null && filters.hasParking !== undefined) {
        query = query.eq('has_parking', filters.hasParking);
      }

      if (filters.hasAC !== null && filters.hasAC !== undefined) {
        query = query.eq('has_ac', filters.hasAC);
      }

      const { count, error: countError } = await query;

      if (countError) throw countError;

      setTotal(count);
    } catch (err) {
      console.error('Error loading total count:', err);
    }
  }, [filters]);

  // Charger une page de propriétés
  const loadPage = useCallback(
    async (page: number, append: boolean = false) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      const isFirstLoad = page === 0 && !append;

      if (isFirstLoad) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      setError(null);

      // Annuler la requête précédente si elle existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        // Vérifier le cache d'abord
        const cacheKey = getCacheKey(page);
        if (enableCache) {
          const cached = cacheService.get<Property[]>(cacheKey);
          if (cached) {
            if (append) {
              setProperties((prev) => [...prev, ...cached]);
            } else {
              setProperties(cached);
            }
            setHasMore(cached.length === pageSize);
            setCurrentPage(page);
            setLoading(false);
            setIsLoadingMore(false);
            loadingRef.current = false;
            return;
          }
        }

        // Construire la requête
        let query = supabase.from('properties').select('*').eq('status', 'disponible');

        // Appliquer les filtres
        if (filters.propertyCategory) {
          query = query.eq('property_category', filters.propertyCategory);
        } else {
          query = query.eq('property_category', 'residentiel');
        }

        if (filters.city && filters.city.trim() !== '' && filters.city !== 'Toutes les villes') {
          query = query.or(`city.ilike.%${filters.city}%,neighborhood.ilike.%${filters.city}%`);
        }

        if (filters.propertyType && filters.propertyType.trim() !== '') {
          query = query.eq('property_type', filters.propertyType);
        }

        if (filters.minPrice && filters.minPrice > 0) {
          query = query.gte('monthly_rent', filters.minPrice);
        }

        if (filters.maxPrice && filters.maxPrice > 0) {
          query = query.lte('monthly_rent', filters.maxPrice);
        }

        if (filters.bedrooms && filters.bedrooms > 0) {
          query = query.gte('bedrooms', filters.bedrooms);
        }

        if (filters.bathrooms && filters.bathrooms > 0) {
          query = query.gte('bathrooms', filters.bathrooms);
        }

        if (filters.isFurnished !== null && filters.isFurnished !== undefined) {
          query = query.eq('furnished', filters.isFurnished);
        }

        if (filters.hasParking !== null && filters.hasParking !== undefined) {
          query = query.eq('has_parking', filters.hasParking);
        }

        if (filters.hasAC !== null && filters.hasAC !== undefined) {
          query = query.eq('has_ac', filters.hasAC);
        }

        // Pagination
        query = query
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;

        const rawProperties = data || [];

        // Enrichir avec les données du propriétaire et filtrer les propriétés vérifiées
        const enrichedProperties = await enrichPropertiesWithOwners(rawProperties);
        const verifiedProperties = enrichedProperties.filter((p) => p.owner_is_verified === true);

        // Sauvegarder dans le cache (on stocke les propriétés enrichies vérifiées)
        if (enableCache && verifiedProperties.length > 0) {
          cacheService.set(cacheKey, verifiedProperties, cacheTTL);
        }

        // Mettre à jour l'état
        if (append) {
          setProperties((prev) => [...prev, ...verifiedProperties]);
        } else {
          setProperties(verifiedProperties);
        }

        // Déterminer s'il y a plus de propriétés à charger
        // Si le nombre de propriétés brutes récupérées est inférieur à pageSize, c'est qu'il n'y a plus de données côté serveur
        // Mais même si rawProperties.length === pageSize, il se peut que verifiedProperties.length < pageSize.
        // On considère qu'il y a plus de données si rawProperties.length === pageSize (car il pourrait y avoir des propriétés vérifiées dans la page suivante)
        setHasMore(rawProperties.length === pageSize);
        setCurrentPage(page);

        // Précharger la page suivante
        if (rawProperties.length === pageSize) {
          // Nettoyer le timeout précédent s'il existe
          if (preloadTimeoutRef.current) {
            clearTimeout(preloadTimeoutRef.current);
          }

          preloadTimeoutRef.current = setTimeout(() => {
            const nextCacheKey = getCacheKey(page + 1);
            if (!cacheService.has(nextCacheKey)) {
              // Précharger silencieusement
              loadPage(page + 1, false).catch(() => {
                // Ignorer les erreurs de préchargement
              });
            }
          }, 1000);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error loading properties:', err);
          setError(err);
        } else if (err instanceof Error) {
          console.error('Error loading properties:', err);
          setError(err);
        } else {
          console.error('Unknown error loading properties:', err);
          setError(new Error('Unknown error'));
        }
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [filters, pageSize, getCacheKey, enableCache, cacheTTL]
  );

  // Charger plus de propriétés
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current) return;
    await loadPage(currentPage + 1, true);
  }, [currentPage, hasMore, loadPage]);

  // Rafraîchir les données
  const refresh = useCallback(async () => {
    // Invalider le cache
    if (enableCache) {
      cacheService.invalidatePattern('properties_page_');
    }

    setCurrentPage(0);
    setHasMore(true);
    await Promise.all([loadPage(0, false), loadTotal()]);
  }, [loadPage, loadTotal, enableCache]);

  // Chargement initial
  useEffect(() => {
    if (!enabled) return;

    setCurrentPage(0);
    setHasMore(true);

    Promise.all([loadPage(0, false), loadTotal()]);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
        preloadTimeoutRef.current = null;
      }
    };
  }, [enabled, filters, loadPage, loadTotal]);

  // Calculer le nombre total de pages
  const totalPages = total ? Math.ceil(total / pageSize) : 0;

  return {
    properties,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    total,
    currentPage,
    totalPages,
    isLoadingMore,
  };
}
