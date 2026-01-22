import { useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { queryKeys, paginatedQueryConfig } from '@/shared/lib/query-config';

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
}: {
  pageParam: number;
  filters: Filters;
  orderColumn: string;
  ascending: boolean;
  pageSize: number;
}) {
  let query = supabase
    .from('properties')
    .select('*', { count: 'exact' })
    .eq('status', 'disponible');

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

  let ownerProfiles: Map<
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
  } = options;

  const { filters, orderColumn, ascending } = buildQueryParams(options);

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
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore) {
        return allPages.length;
      }
      return undefined;
    },
    ...paginatedQueryConfig,
  });

  // Flatten all pages into a single array
  const properties = data?.pages.flatMap((page) => page.data) ?? [];

  // Get count from first page
  const totalCount = data?.pages[0]?.count ?? 0;

  // Convert error to string
  const errorString = error instanceof Error ? error.message : null;

  // Load more function
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    properties,
    loading: isLoading,
    loadingMore: isFetchingNextPage,
    error: errorString,
    hasMore: hasNextPage ?? false,
    loadMore,
    refresh: () => refetch(),
    totalCount,
  };
}
