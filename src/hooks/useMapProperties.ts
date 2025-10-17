import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';

export interface MapProperty {
  id: string;
  title: string;
  city: string;
  neighborhood: string | null;
  monthly_rent: number;
  latitude: number;
  longitude: number;
  main_image: string | null;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  surface_area: number;
  status: string;
  amenities: string[] | null;
}

interface UseMapPropertiesOptions {
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    propertyType?: string;
    minBedrooms?: number;
    maxBedrooms?: number;
    amenities?: string[];
  };
  refetchInterval?: number;
}

export const useMapProperties = (options: UseMapPropertiesOptions = {}) => {
  const { filters, refetchInterval = 30000 } = options;

  return useQuery({
    queryKey: ['map-properties', filters],
    queryFn: async () => {
      try {
        let query = supabase
          .from('properties')
          .select(`
            id,
            title,
            city,
            neighborhood,
            monthly_rent,
            latitude,
            longitude,
            main_image,
            property_type,
            bedrooms,
            bathrooms,
            surface_area,
            status,
            amenities
          `)
          .eq('status', 'disponible')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        // Apply filters
        if (filters?.minPrice) {
          query = query.gte('monthly_rent', filters.minPrice);
        }
        if (filters?.maxPrice) {
          query = query.lte('monthly_rent', filters.maxPrice);
        }
        if (filters?.propertyType) {
          query = query.eq('property_type', filters.propertyType);
        }
        if (filters?.minBedrooms) {
          query = query.gte('bedrooms', filters.minBedrooms);
        }
        if (filters?.maxBedrooms) {
          query = query.lte('bedrooms', filters.maxBedrooms);
        }

        const { data, error } = await query;

        if (error) {
          logger.logError(error, { context: 'useMapProperties' });
          throw error;
        }

        // Filter by amenities if needed (client-side since it's an array)
        let filteredData = data || [];
        if (filters?.amenities && filters.amenities.length > 0) {
          filteredData = filteredData.filter(property => {
            if (!property.amenities) return false;
            return filters.amenities!.some(amenity => 
              property.amenities!.includes(amenity)
            );
          });
        }

        logger.info(`Loaded ${filteredData.length} properties for map`, {
          filters,
          count: filteredData.length
        });

        return filteredData as MapProperty[];
      } catch (error) {
        logger.logError(error, { context: 'useMapProperties' });
        return [];
      }
    },
    refetchInterval,
    staleTime: 20000, // Consider data stale after 20s
  });
};

// Hook pour les statistiques de la carte
export const useMapStats = (properties: MapProperty[]) => {
  const stats = {
    totalProperties: properties.length,
    avgPrice: properties.length > 0
      ? Math.round(properties.reduce((sum, p) => sum + p.monthly_rent, 0) / properties.length)
      : 0,
    minPrice: properties.length > 0
      ? Math.min(...properties.map(p => p.monthly_rent))
      : 0,
    maxPrice: properties.length > 0
      ? Math.max(...properties.map(p => p.monthly_rent))
      : 0,
    neighborhoods: [...new Set(properties.map(p => p.neighborhood).filter(Boolean))].length,
    cities: [...new Set(properties.map(p => p.city))].length,
    propertyTypes: [...new Set(properties.map(p => p.property_type))].length,
  };

  return stats;
};

