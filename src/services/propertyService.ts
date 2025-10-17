import { supabase } from '@/lib/supabase';
import type { Property, SearchFilters } from '@/types';
import { logger } from '@/services/logger';

/**
 * Helper to determine if a property should be shown to a user
 */
export const shouldShowProperty = (property: Property, currentUserId?: string): boolean => {
  // ALWAYS show to property owner
  if (currentUserId && (property as any).owner_id === currentUserId) {
    return true;
  }
  // Normalize status and hide rented/archived states for public users
  const status = (property as any).status?.toString().toLowerCase();
  const rentedStatuses = new Set(['loué', 'loue', 'rented', 'occupied', 'indisponible', 'archived', 'archivé']);
  return !rentedStatuses.has(status);
};

/**
 * Parse Supabase/Postgres errors into user-friendly messages
 */
export function parsePropertyError(error: Error | { message?: string; code?: string } | unknown): string {
  if (!error) return 'Une erreur inconnue est survenue';

  const errorMessage = error instanceof Error ? error.message : ((error as any)?.message || String(error));
  const errorCode = (error as any)?.code;

  // Postgres constraint violations
  if (errorCode === '23505') {
    return 'Une propriété similaire existe déjà. Vérifiez vos données.';
  }
  
  if (errorCode === '23503') {
    return 'Référence invalide. Assurez-vous que toutes les informations sont correctes.';
  }

  if (errorCode === '23502') {
    return 'Champs obligatoires manquants. Veuillez remplir tous les champs requis.';
  }

  // RLS policy violations
  if (errorMessage.includes('RLS') || errorMessage.includes('policy')) {
    return 'Permissions insuffisantes. Connectez-vous avec un compte propriétaire.';
  }

  // Geolocation errors
  if (errorMessage.includes('latitude') || errorMessage.includes('longitude')) {
    return 'Erreur de localisation. Veuillez sélectionner un emplacement valide sur la carte.';
  }

  // Network/timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
    return 'Problème de connexion. Vérifiez votre connexion internet et réessayez.';
  }

  // Generic validation errors
  if (errorMessage.includes('invalid') || errorMessage.includes('invalide')) {
    return 'Données invalides. Vérifiez que tous les champs sont correctement remplis.';
  }

  // Return original message if no pattern matches
  return errorMessage.length > 100 
    ? 'Erreur lors de la création de la propriété. Veuillez réessayer.' 
    : errorMessage;
}

/**
 * Centralized property service for all property-related database operations
 */
export const propertyService = {
  /**
   * Fetch all properties with optional filters
   * Uses secure RPC to hide owner_id from public queries
   */
  async fetchAll(filters?: SearchFilters): Promise<Property[]> {
    logger.debug('PropertyService fetchAll called with filters', { filters });
    
    // SECURITY: Use RPC for public property browsing (hides owner_id)
    // For ANSUT certified properties, still use direct query with join
    if (filters?.isAnsutCertified) {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          leases!inner(certification_status)
        `)
        .eq('leases.certification_status', 'certified')
        .order('created_at', { ascending: false });

      if (error) {
        logger.logError(error, { context: 'propertyService', action: 'fetchCertifiedProperties' });
        throw error;
      }
      
      // Remove duplicates if multiple certified leases for the same property
      const uniqueProperties = data.reduce((acc, current) => {
        const exists = acc.find(item => item.id === current.id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, [] as any[]);

      logger.info('ANSUT certified properties found', { count: uniqueProperties.length });
      return uniqueProperties as Property[];
    }

    // Try secure RPC for public browsing, but with better error handling
    let { data, error } = await supabase.rpc('get_public_properties', {
      p_city: filters?.city || null,
      p_property_type: filters?.propertyType?.[0] || null,
      p_min_rent: filters?.minPrice || null,
      p_max_rent: filters?.maxPrice || null,
      p_min_bedrooms: filters?.minBedrooms || null,
      p_status: null, // RPC handles filtering
    });

    // Fallback: if RPC is missing (404) or fails, try a safe direct query
    if (error || !data) {
      if (error?.code === 'PGRST116' || error?.message?.includes('function') || error?.message?.includes('404')) {
        logger.warn('RPC function get_public_properties does not exist, using direct query fallback', { error });
      } else {
        logger.warn('RPC get_public_properties failed, falling back to direct SELECT', { error });
      }
      // Try a permissive select without moderation_status (some projects don't have this column)
      const fallback = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (fallback.error) {
        logger.logError(fallback.error, { context: 'propertyService', action: 'fetchAllPropertiesFallback' });

        // Provide more context in error message
        const enhancedError = new Error(
          `Failed to fetch properties: ${fallback.error.message || 'Unknown error'}. ${
            fallback.error.code ? `Error code: ${fallback.error.code}` : ''
          }`
        );
        (enhancedError as any).originalError = fallback.error;
        throw enhancedError;
      }

      const fallbackData = fallback.data as any[];
      data = fallbackData;
    }

    logger.debug('Properties received from API', { count: data?.length || 0 });

    // Log sample property data structure to understand what we're working with
    if (data && data.length > 0) {
      logger.info('Sample property data structure', {
        sampleProperty: {
          id: data[0].id,
          title: data[0].title,
          main_image: data[0].main_image,
          images: data[0].images,
          images_count: data[0].images?.length || 0,
          property_type: data[0].property_type,
          monthly_rent: data[0].monthly_rent,
          city: data[0].city
        }
      });

      // Log image availability statistics
      const stats = {
        total: data.length,
        withMainImage: data.filter(p => p.main_image && p.main_image.trim() !== '').length,
        withImagesArray: data.filter(p => p.images && Array.isArray(p.images) && p.images.length > 0).length,
        withoutAnyImages: data.filter(p => (!p.main_image || p.main_image.trim() === '') && (!p.images || p.images.length === 0)).length
      };
      logger.info('Image availability statistics', stats);
    }

    // Apply client-side filters not supported by RPC
    let results = data || [];
    
    // CRITICAL: Filter out rented properties from public view (unless user is owner)
    const { data: { user } } = await supabase.auth.getUser();
    const beforeFilter = results.length;
    results = results.filter(p => shouldShowProperty(p as any, user?.id));
    logger.debug('Properties filtered by visibility', { before: beforeFilter, after: results.length });
    
    if (filters?.propertyType && filters.propertyType.length > 1) {
      const before = results.length;
      results = results.filter(p => filters.propertyType?.includes(p.property_type));
      logger.debug('Properties filtered by type', { before, after: results.length });
    }
    if (filters?.minBathrooms) {
      const before = results.length;
      results = results.filter(p => p.bathrooms >= filters.minBathrooms!);
      logger.debug('Properties filtered by bathrooms', { before, after: results.length });
    }
    if (filters?.minSurface) {
      const before = results.length;
      results = results.filter(p => p.surface_area && p.surface_area >= filters.minSurface!);
      logger.debug('Properties filtered by surface', { before, after: results.length });
    }
    if (filters?.isFurnished !== undefined) {
      const before = results.length;
      results = results.filter(p => p.is_furnished === filters.isFurnished);
      logger.debug('Properties filtered by furnished status', { before, after: results.length });
    }
    if (filters?.hasParking !== undefined) {
      const before = results.length;
      results = results.filter(p => p.has_parking === filters.hasParking);
      logger.debug('Properties filtered by parking', { before, after: results.length });
    }
    if (filters?.hasGarden !== undefined) {
      const before = results.length;
      results = results.filter(p => p.has_garden === filters.hasGarden);
      logger.debug('Properties filtered by garden', { before, after: results.length });
    }
    if (filters?.hasAc !== undefined) {
      const before = results.length;
      results = results.filter(p => p.has_ac === filters.hasAc);
      logger.debug('Properties filtered by AC', { before, after: results.length });
    }

    logger.info('Final property results after filtering', { count: results.length });

    // ENHANCEMENT: Add demo images for properties without real images
    const enhancedResults = results.map(property => {
      // Check if property has valid images
      const hasValidMainImage = property.main_image && property.main_image.trim() !== '';
      const hasValidImagesArray = property.images && Array.isArray(property.images) && property.images.length > 0;

      // If no valid images, add demo images
      if (!hasValidMainImage && !hasValidImagesArray) {
        logger.debug('Adding demo images to property', { propertyId: property.id, title: property.title });
        const seed = property.id.slice(-8);
        const typeMap: Record<string, string> = {
          'appartement': 'apartment',
          'villa': 'house',
          'studio': 'room',
          'duplex': 'building',
          'bureau': 'office',
          'local_commercial': 'store'
        };
        const imageType = typeMap[property.property_type.toLowerCase()] || 'apartment';

        // Add demo images array
        property.images = [
          `https://picsum.photos/seed/${imageType}-${seed}-1/400/300.jpg`,
          `https://picsum.photos/seed/${imageType}-${seed}-2/400/300.jpg`,
          `https://picsum.photos/seed/${imageType}-${seed}-3/400/300.jpg`
        ];

        // Add main_image as first image
        property.main_image = property.images[0];

        logger.debug('Demo images added', {
          propertyId: property.id,
          imagesCount: property.images.length,
          mainImage: property.main_image
        });
      }

      return property;
    });

    // Note: owner_id is intentionally excluded by RPC for security
    return enhancedResults as unknown as Property[];
  },

  /**
   * Fetch a single property by ID
   * SECURITY: If user is authenticated, try direct query first (allows owners to see pending properties)
   * Otherwise, use public RPC for approved properties
   */
  async fetchById(id: string): Promise<Property | null> {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    // If authenticated, try direct query first (RLS will grant access if user is owner/admin)
    if (user) {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      // If success and data exists, return (owner can see their pending property)
      if (!error && data) {
        return data;
      }
    }
    
    // Otherwise, try public RPC (for approved properties)
    const { data: publicData, error: publicError } = await supabase.rpc('get_public_property', {
      p_property_id: id
    });

    if (!publicError && publicData && publicData.length > 0) {
      return publicData[0] as unknown as Property;
    }

    // No method found the property
    return null;
  },

  /**
   * Fetch properties by owner ID
   */
  async fetchByOwner(ownerId: string): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.logError(error, { context: 'propertyService', action: 'fetchByOwner', ownerId });
      throw error;
    }

    return data || [];
  },

  /**
   * Update a property
   */
  async update(id: string, updates: Partial<Property>): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.logError(error, { context: 'propertyService', action: 'updateProperty', propertyId: id });
      const userMessage = parsePropertyError(error);
      throw new Error(userMessage);
    }

    return data;
  },

  /**
   * Delete a property
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) {
      logger.logError(error, { context: 'propertyService', action: 'deleteProperty', propertyId: id });
      const userMessage = parsePropertyError(error);
      throw new Error(userMessage);
    }
  },

  /**
   * Increment view count for a property
   */
  async incrementViewCount(id: string): Promise<void> {
    // Manually increment view count
    const { data: property } = await supabase
      .from('properties')
      .select('view_count')
      .eq('id', id)
      .single();

    if (property) {
      const { error } = await supabase
        .from('properties')
        .update({ view_count: (property.view_count || 0) + 1 })
        .eq('id', id);

      if (error) {
        logger.logError(error, { context: 'propertyService', action: 'incrementViewCount', propertyId: id });
        throw error;
      }
    }
  },

  /**
   * Get property statistics
   */
  async getStats(propertyId: string) {
    const [favoritesResult, applicationsResult, propertyResult] = await Promise.all([
      supabase
        .from('user_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId),
      supabase
        .from('rental_applications')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId),
      supabase
        .from('properties')
        .select('view_count')
        .eq('id', propertyId)
        .single(),
    ]);

    const views = propertyResult.data?.view_count || 0;
    const applications = applicationsResult.count || 0;

    return {
      views,
      favorites: favoritesResult.count || 0,
      applications,
      conversionRate: views > 0 ? Math.round((applications / views) * 100) : 0,
    };
  },

  /**
   * Search properties with geo-location filtering
   */
  async searchNearby(
    latitude: number,
    longitude: number,
    radiusKm: number,
    filters?: SearchFilters
  ): Promise<Property[]> {
    // First fetch all properties with filters
    const properties = await this.fetchAll(filters);

    // Filter by distance (using Haversine formula in geo.ts)
    const { calculateDistance } = await import('@/lib/geo');

    return properties.filter((property) => {
      if (!property.latitude || !property.longitude) return false;

      const distance = calculateDistance(
        latitude,
        longitude,
        property.latitude,
        property.longitude
      );

      return distance <= radiusKm;
    });
  },
};
