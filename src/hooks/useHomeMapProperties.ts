import { useState, useCallback } from 'react';
import { supabase, SUPABASE_API_URL } from '@/integrations/supabase/client';

interface PublicProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  trust_score: number | null;
  is_verified: boolean | null;
  city: string | null;
  oneci_verified: boolean | null;
  cnam_verified: boolean | null;
}

const fetchOwnerProfiles = async (ownerIds: string[]): Promise<Map<string, PublicProfile>> => {
  const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('public_profiles_view')
    .select('*')
    .in('id', uniqueIds);

  if (error) {
    return new Map();
  }

  const profileMap = new Map<string, PublicProfile>();
  (data || []).forEach((profile: unknown) => {
    const p = profile as {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      trust_score: number | null;
      is_verified: boolean | null;
      city: string | null;
      oneci_verified: boolean | null;
      cnam_verified: boolean | null;
    };
    profileMap.set(p.id, {
      user_id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      trust_score: p.trust_score,
      is_verified: p.is_verified,
      city: p.city,
      oneci_verified: p.oneci_verified,
      cnam_verified: p.cnam_verified,
    });
  });

  return profileMap;
};

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
          'id, title, latitude, longitude, price, property_type, city, neighborhood, main_image, bedrooms, surface_area, status, owner_id'
        )
        .eq('status', 'disponible')
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

      // Map properties with owner_id
      const propertiesWithOwner = (data || [])
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
          bedrooms: p.bedrooms,
          surface_area: p.surface_area,
          status: p.status,
          owner_id: p.owner_id,
        }));

      // Collect owner IDs
      const ownerIds = propertiesWithOwner.map((p) => p.owner_id).filter(Boolean);
      const ownerProfiles = await fetchOwnerProfiles(ownerIds);

      // Filter properties where owner is verified
      const verifiedProperties = propertiesWithOwner.filter((p) => {
        const profile = ownerProfiles.get(p.owner_id);
        return profile?.is_verified === true;
      });

      // Convert to MapProperty (without owner_id)
      const validProperties: MapProperty[] = verifiedProperties.map((p) => ({
        id: p.id,
        title: p.title,
        latitude: p.latitude,
        longitude: p.longitude,
        monthly_rent: p.monthly_rent,
        property_type: p.property_type,
        city: p.city,
        neighborhood: p.neighborhood,
        main_image: p.main_image,
        bedrooms: p.bedrooms,
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

  const fetchInitialProperties = useCallback(async (filters?: Filters) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('properties')
        .select(
          'id, title, latitude, longitude, price, property_type, city, neighborhood, main_image, bedrooms, surface_area, status, owner_id'
        )
        .eq('status', 'disponible')
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

      // Map properties with owner_id
      const propertiesWithOwner = (data || [])
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
          bedrooms: p.bedrooms,
          surface_area: p.surface_area,
          status: p.status,
          owner_id: p.owner_id,
        }));

      // Collect owner IDs
      const ownerIds = propertiesWithOwner.map((p) => p.owner_id).filter(Boolean);
      const ownerProfiles = await fetchOwnerProfiles(ownerIds);

      // Filter properties where owner is verified
      const verifiedProperties = propertiesWithOwner.filter((p) => {
        const profile = ownerProfiles.get(p.owner_id);
        return profile?.is_verified === true;
      });

      // Convert to MapProperty (without owner_id)
      const validProperties: MapProperty[] = verifiedProperties.map((p) => ({
        id: p.id,
        title: p.title,
        latitude: p.latitude,
        longitude: p.longitude,
        monthly_rent: p.monthly_rent,
        property_type: p.property_type,
        city: p.city,
        neighborhood: p.neighborhood,
        main_image: p.main_image,
        bedrooms: p.bedrooms,
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
