import { useMemo, useState, useCallback } from 'react';
import type { PropertyWithOwnerScore } from '../types';
import { formatAddress } from '@/shared/utils/address';

export interface PropertyFilters {
  type: string;
  location: string;
  minPrice: number;
  maxPrice: number;
}

const DEFAULT_FILTERS: PropertyFilters = {
  type: 'all',
  location: '',
  minPrice: 0,
  maxPrice: 10000000,
};

export function usePropertyFiltering(properties: PropertyWithOwnerScore[]) {
  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS);

  // Memoized filtering logic
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      // Filter by type
      const matchType =
        filters.type === 'all' ||
        property.property_type?.toLowerCase() === filters.type.toLowerCase();

      // Filter by location (city, neighborhood, address)
      const searchTerm = filters.location.toLowerCase().trim();
      const addressText = formatAddress(property.address as any, property.city).toLowerCase();
      const matchLocation =
        !searchTerm ||
        property.city?.toLowerCase().includes(searchTerm) ||
        property.neighborhood?.toLowerCase().includes(searchTerm) ||
        addressText.includes(searchTerm);

      // Filter by price range
      const price = property.monthly_rent || 0;
      const matchPrice =
        price >= filters.minPrice && (filters.maxPrice === 0 || price <= filters.maxPrice);

      return matchType && matchLocation && matchPrice;
    });
  }, [properties, filters]);

  // Update a single filter
  const updateFilter = useCallback(
    <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Count active filters (excluding defaults)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.location.trim()) count++;
    if (filters.minPrice > 0) count++;
    if (filters.maxPrice < 10000000 && filters.maxPrice > 0) count++;
    return count;
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    filteredProperties,
    activeFiltersCount,
    totalCount: properties.length,
    filteredCount: filteredProperties.length,
  };
}
