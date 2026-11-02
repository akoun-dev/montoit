import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MapProperty {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  monthly_rent: number;
  property_type: string;
  city: string;
  neighborhood: string | null;
  main_image: string | null;
  bedrooms: number | null;
  surface_area: number | null;
  status: string | null;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface Filters {
  propertyType?: string;
  maxPrice?: number;
}

export function useHomeMapProperties() {
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPropertiesInBounds = useCallback(async (bounds: MapBounds, filters?: Filters) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('properties')
        .select(
          'id, title, latitude, longitude, price, property_type, city, neighborhood, main_image, bedrooms, surface_area, status'
        )
        .eq('status', 'disponible')
        .eq('ansut_verified', true) // Uniquement les propriétés certifiées ANSUT
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .gte('latitude', bounds.south)
        .lte('latitude', bounds.north)
        .gte('longitude', bounds.west)
        .lte('longitude', bounds.east)
        .limit(100);

      // Filtres optionnels
      if (filters?.propertyType && filters.propertyType !== 'all') {
        query = query.eq('property_type', filters.propertyType);
      }
      if (filters?.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const validProperties: MapProperty[] = (data || [])
        .filter((p) => p.latitude !== null && p.longitude !== null)
        .map((p) => ({
          id: p.id,
          title: p.title,
          latitude: p.latitude as number,
          longitude: p.longitude as number,
          monthly_rent: p.price, // colonne price
          property_type: p.property_type,
          city: p.city,
          neighborhood: p.neighborhood,
          main_image: p.main_image,
          bedrooms: p.bedrooms ?? null,
          surface_area: p.surface_area,
          status: p.status,
        }));

      setProperties(validProperties);
      setTotalCount(validProperties.length);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching map properties:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInitialProperties = useCallback(async (filters?: Filters) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('properties')
        .select(
          'id, title, latitude, longitude, price, property_type, city, neighborhood, main_image, bedrooms, surface_area, status'
        )
        .eq('status', 'disponible')
        .eq('ansut_verified', true) // Uniquement les propriétés certifiées ANSUT
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(50);

      if (filters?.propertyType && filters.propertyType !== 'all') {
        query = query.eq('property_type', filters.propertyType);
      }
      if (filters?.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const validProperties: MapProperty[] = (data || [])
        .filter((p) => p.latitude !== null && p.longitude !== null)
        .map((p) => ({
          id: p.id,
          title: p.title,
          latitude: p.latitude as number,
          longitude: p.longitude as number,
          monthly_rent: p.price, // colonne price
          property_type: p.property_type,
          city: p.city,
          neighborhood: p.neighborhood,
          main_image: p.main_image,
          bedrooms: p.bedrooms ?? null,
          surface_area: p.surface_area,
          status: p.status,
        }));

      setProperties(validProperties);
      setTotalCount(validProperties.length);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    properties,
    loading,
    error,
    totalCount,
    fetchPropertiesInBounds,
    fetchInitialProperties,
  };
}
