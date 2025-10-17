import { useState, useEffect } from 'react';
import { Property, SearchFilters, GeoLocation } from '@/types';
import { calculateDistance, getCurrentLocation, hasCoordinates } from '@/lib/geo';
import { logger } from '@/services/logger';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const usePropertyFilters = (properties: Property[]) => {
  const { user } = useAuth();
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(properties);
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);

  useEffect(() => {
    setFilteredProperties(properties);
  }, [properties]);

  const handleFilterChange = (filters: SearchFilters) => {
    let filtered = [...properties];

    // City filter
    if (filters.city) {
      filtered = filtered.filter(p => 
        p.city.toLowerCase().includes(filters.city!.toLowerCase())
      );
    }

    // Price range
    if (filters.minPrice) {
      filtered = filtered.filter(p => p.monthly_rent >= filters.minPrice!);
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(p => p.monthly_rent <= filters.maxPrice!);
    }

    // Property type
    if (filters.propertyType && filters.propertyType.length > 0) {
      filtered = filtered.filter(p => 
        filters.propertyType!.includes(p.property_type)
      );
    }

    // Bedrooms
    if (filters.minBedrooms) {
      filtered = filtered.filter(p => p.bedrooms >= filters.minBedrooms!);
    }

    // Bathrooms
    if (filters.minBathrooms) {
      filtered = filtered.filter(p => p.bathrooms >= filters.minBathrooms!);
    }

    // Surface area
    if (filters.minSurface) {
      filtered = filtered.filter(p => 
        p.surface_area && p.surface_area >= filters.minSurface!
      );
    }

    // Amenities
    if (filters.furnished) {
      filtered = filtered.filter(p => p.is_furnished);
    }
    if (filters.parking) {
      filtered = filtered.filter(p => p.has_parking);
    }
    if (filters.garden) {
      filtered = filtered.filter(p => p.has_garden);
    }
    if (filters.ac) {
      filtered = filtered.filter(p => p.has_ac);
    }

    setFilteredProperties(filtered);
  };

  const handleLocationSearch = async (radiusKm: number = 5) => {
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);

      const filtered = properties
        .filter(hasCoordinates)
        .filter(property => {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            property.latitude,
            property.longitude
          );

          return distance <= radiusKm;
        });

      setFilteredProperties(filtered);

      // Track search for recommendations
      if (user) {
        await supabase.functions.invoke('track-search', {
          body: {
            userId: user.id,
            filters: { location, radius: radiusKm },
            resultCount: filtered.length,
          },
        });
      }
    } catch (error) {
      logger.error('Error getting location', { error, userId: user?.id, radiusKm });
    }
  };

  const handleReset = () => {
    setFilteredProperties(properties);
    setUserLocation(null);
  };

  return {
    filteredProperties,
    userLocation,
    handleFilterChange,
    handleLocationSearch,
    handleReset,
  };
};
