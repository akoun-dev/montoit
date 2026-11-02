import { useCallback, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { queryKeys, searchPropertiesConfig, propertyDetailConfig } from '@/shared/lib/query-config';

type Property = Database['public']['Tables']['properties']['Row'];
type PropertyWithScore = Property & {
  owner_trust_score?: number | null;
  owner_full_name?: string | null;
  owner_is_verified?: boolean | null;
};

interface UseInfinitePropertiesOptions {
  city?: string;
  propertyType?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  sortBy?: 'recent' | 'price_asc' | 'price_desc';
  pageSize?: number;
  ansutVerifiedOnly?: boolean;
}

interface UseInfinitePropertiesResult {
  properties: PropertyWithScore[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  totalCount: number;
  prefetchPage?: (pageNumber: number) => void;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Build query parameters for Supabase based on filters
 */
interface Filters {
  cityOrNeighborhood?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
}

function buildQueryParams(options: UseInfinitePropertiesOptions) {
  const { city, propertyType, minPrice, maxPrice, bedrooms, sortBy } = options;

  const filters: Filters = {};

  if (city?.trim()) {
    const searchValue = city.trim();
    filters.cityOrNeighborhood = searchValue;
  }
  if (propertyType?.trim()) {
    filters.propertyType = propertyType.trim();
  }
  if (minPrice?.trim()) {
    const min = parseInt(minPrice, 10);
    if (!isNaN(min) && min >= 0) {
      filters.minPrice = min;
    }
  }
  if (maxPrice?.trim()) {
    const max = parseInt(maxPrice, 10);
    if (!isNaN(max) && max >= 0) {
      filters.maxPrice = max;
    }
  }
  if (bedrooms?.trim()) {
    const beds = parseInt(bedrooms, 10);
    if (!isNaN(beds) && beds > 0) {
      filters.bedrooms = beds;
    }
  }

  const orderColumn =
    sortBy === 'price_asc' || sortBy === 'price_desc' ? 'price' : 'created_at';
  const ascending = sortBy === 'price_asc';

  return { filters, orderColumn, ascending };
}

/**
 * Fetch properties from Supabase with owner enrichment
 */
async function fetchProperties({
  pageParam,
  filters,
  orderColumn,
  ascending,
  pageSize,
  ansutVerifiedOnly,
}: {
  pageParam: number;
  filters: Filters;
  orderColumn: string;
  ascending: boolean;
  pageSize: number;
  ansutVerifiedOnly?: boolean;
}) {
  let query = supabase
    .from('properties')
    .select('*', { count: 'exact' })
    .eq('status', 'disponible');

  // Filtrer uniquement les propriétés certifiées ANSUT si demandé
  if (ansutVerifiedOnly) {
    query = query.eq('ansut_verified', true);
  }

  if (filters.cityOrNeighborhood) {
    query = query.or(
      `city.ilike.%${filters.cityOrNeighborhood}%,neighborhood.ilike.%${filters.cityOrNeighborhood}%`
    );
  }
  if (filters.propertyType) {
    query = query.eq('property_type', filters.propertyType);
  }
  if (filters.minPrice !== undefined) {
    query = query.gte('price', filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte('price', filters.maxPrice);
  }
  if (filters.bedrooms !== undefined) {
    query = query.eq('bedrooms', filters.bedrooms);
  }

  const { data, error: queryError, count } = await query
    .order(orderColumn, { ascending })
    .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1);

  if (queryError) {
    if (queryError.code === 'PGRST103' || queryError.message?.includes('416')) {
      return { data: [], count: 0, hasMore: false };
    }
    throw new Error(
      typeof queryError.message === 'string' && queryError.message.trim().length > 5
        ? queryError.message
        : 'Erreur lors du chargement des propriétés'
    );
  }

  const ownerIds = (data || []).map((p) => p.owner_id).filter((id): id is string => id !== null);
  const uniqueOwnerIds = [...new Set(ownerIds)];

  const ownerProfiles: Map<
    string,
    { trust_score: number | null; full_name: string | null; is_verified: boolean | null }
  > = new Map();

  if (uniqueOwnerIds.length > 0) {
    const { data: profilesData } = await supabase.rpc('get_public_profiles', {
      profile_user_ids: uniqueOwnerIds,
    });

    (profilesData || []).forEach(
      (profile: {
        user_id: string;
        trust_score: number | null;
        full_name: string | null;
        is_verified: boolean | null;
      }) => {
        ownerProfiles.set(profile.user_id, {
          trust_score: profile.trust_score,
          full_name: profile.full_name,
          is_verified: profile.is_verified,
        });
      }
    );
  }

  const enrichedData = (data || []).map((p) => {
    const owner = p.owner_id ? ownerProfiles.get(p.owner_id) : null;
    return {
      ...p,
      owner_trust_score: owner?.trust_score ?? null,
      owner_full_name: owner?.full_name ?? null,
      owner_is_verified: owner?.is_verified ?? null,
    };
  });

  const safeCount = Number.isFinite(count) ? count : null;
  const hasMore = safeCount == null ? enrichedData.length === pageSize : enrichedData.length < safeCount;

  return {
    data: enrichedData,
    count: safeCount ?? enrichedData.length,
    hasMore,
  };
}

export function useInfiniteProperties(
  options: UseInfinitePropertiesOptions
): UseInfinitePropertiesResult {
  const {
    city,
    propertyType,
    minPrice,
    maxPrice,
    bedrooms,
    sortBy = 'recent',
    pageSize = DEFAULT_PAGE_SIZE,
    ansutVerifiedOnly,
  } = options;

  const queryClient = useQueryClient();
  const { filters, orderColumn, ascending } = buildQueryParams(options);
  const prefetchedPages = useRef<Set<number>>(new Set());

  // Build cache key based on filters
  const queryKey = [
    ...queryKeys.properties.list({
      city,
      propertyType,
      minPrice,
      maxPrice,
      bedrooms,
      sortBy,
    }),
  ];

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 0 }) =>
      fetchProperties({
        pageParam,
        filters,
        orderColumn,
        ascending,
        pageSize,
        ansutVerifiedOnly,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore) {
        return allPages.length;
      }
      return undefined;
    },
    ...searchPropertiesConfig,
  });

  // Flatten all pages into a single array
  const properties = data?.pages.flatMap((page) => page.data) ?? [];

  // Get count from first page
  const totalCount = data?.pages[0]?.count ?? 0;

  // Convert error to string
  const errorString = error instanceof Error ? error.message : null;

  // Intelligent prefetching of next page when approaching the end
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const currentPage = data?.pages.length ?? 0;
    const visibleItems = currentPage * pageSize;
    const threshold = Math.floor(totalCount * 0.7); // Prefetch at 70% of content

    if (visibleItems >= threshold && !prefetchedPages.current.has(currentPage)) {
      prefetchedPages.current.add(currentPage);
      fetchNextPage();
    }
  }, [data, hasNextPage, isFetchingNextPage, fetchNextPage, pageSize, totalCount]);

  // Prefetch property details for visible items
  useEffect(() => {
    const visibleProperties = properties.slice(0, 12); // First 12 properties (typically visible)
    const prefetchDelay = 100; // Small delay to prioritize initial render

    const timer = setTimeout(() => {
      visibleProperties.forEach((property, index) => {
        // Stagger prefetching to avoid overwhelming the network
        setTimeout(() => {
          queryClient.prefetchQuery({
            queryKey: queryKeys.properties.detail(property.id),
            queryFn: async () => {
              const { data } = await supabase
                .from('properties')
                .select('*')
                .eq('id', property.id)
                .eq('status', 'disponible')
                .single();

              if (!data) return null;

              // Fetch owner data
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
            },
            ...propertyDetailConfig,
          });
        }, index * 100); // 100ms delay between each prefetch
      });
    }, prefetchDelay);

    return () => clearTimeout(timer);
  }, [properties, queryClient]);

  // Load more function
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Prefetch a specific page number (useful for pagination UI)
  const prefetchPage = useCallback(
    (pageNumber: number) => {
      if (!prefetchedPages.current.has(pageNumber)) {
        prefetchedPages.current.add(pageNumber);
        queryClient.prefetchInfiniteQuery({
          queryKey,
          queryFn: ({ pageParam = 0 }) =>
            fetchProperties({
              pageParam,
              filters,
              orderColumn,
              ascending,
              pageSize,
              ansutVerifiedOnly,
            }),
          initialPageParam: 0,
          pages: pageNumber + 1,
          ...searchPropertiesConfig,
        });
      }
    },
    [queryClient, queryKey, filters, orderColumn, ascending, pageSize]
  );

  return {
    properties,
    loading: isLoading,
    loadingMore: isFetchingNextPage,
    error: errorString,
    hasMore: hasNextPage ?? false,
    loadMore,
    refresh: () => refetch(),
    totalCount,
    prefetchPage,
  };
}
