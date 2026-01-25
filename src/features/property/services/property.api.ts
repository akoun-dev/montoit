/**
 * Service API pour la gestion des propriétés avec cache intégré
 *
 * Ce service centralise tous les appels API liés aux propriétés immobilières
 * et utilise le CacheService pour optimiser les performances.
 *
 * SÉCURITÉ: Utilise get_public_profile() pour récupérer les données propriétaire
 * au lieu de jointures directes sur profiles (RLS sécurisé)
 */

import { supabase, SUPABASE_API_URL } from '@/integrations/supabase/client';
import { withErrorHandling } from '@/integrations/supabase/error-handler';
import { cacheService } from '@/shared/services/cacheService';
import type { Database } from '@/shared/lib/database.types';
import type { PropertyWithOwnerScore } from '../types';
import { requirePermission, requireOwnership } from '@/shared/services/roleValidation.service';

type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

const CACHE_TTL_MINUTES = 15;
const CACHE_PREFIX = 'properties_';

// Type pour les données publiques du propriétaire retournées par get_public_profile
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

// Type pour les lignes de la vue public_profiles_view
interface PublicProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  trust_score: number | null;
  is_verified: boolean | null;
  city: string | null;
  oneci_verified: boolean | null;
  cnam_verified: boolean | null;
}

export interface PropertyFilters {
  city?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  maxRooms?: number;
  minArea?: number;
  maxArea?: number;
  status?: string;
}

/**
 * Récupère les profils publics des propriétaires
 */
const fetchOwnerProfiles = async (ownerIds: string[]): Promise<Map<string, PublicProfile>> => {
  const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  // Use public view for anonymous access
  const { data, error } = await supabase
    .from('public_profiles_view')
    .select('*')
    .in('id', uniqueIds);

  if (error) {
    console.error('Error fetching owner profiles:', error);
    return new Map();
  }

  const profileMap = new Map<string, PublicProfile>();
  ((data as PublicProfileRow[]) || []).forEach((profile) => {
    profileMap.set(profile.id, {
      user_id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      trust_score: profile.trust_score,
      is_verified: profile.is_verified,
      city: profile.city,
      oneci_verified: profile.oneci_verified,
      cnam_verified: profile.cnam_verified,
    });
  });

  return profileMap;
};

/**
 * Enrichit les propriétés avec les données publiques des propriétaires
 */
export const enrichPropertiesWithOwners = async (
  properties: Database['public']['Tables']['properties']['Row'][]
): Promise<PropertyWithOwnerScore[]> => {
  const ownerIds = properties.map((p) => p.owner_id).filter((id): id is string => id !== null);
  const ownerProfiles = await fetchOwnerProfiles(ownerIds);

  return properties.map((property) => {
    const owner = property.owner_id ? ownerProfiles.get(property.owner_id) : null;
    return {
      ...property,
      owner_trust_score: owner?.trust_score ?? null,
      owner_full_name: owner?.full_name ?? null,
      owner_avatar_url: owner?.avatar_url ?? null,
      owner_is_verified: owner?.is_verified ?? null,
    } as PropertyWithOwnerScore;
  });
};

/**
 * Enrichit une seule propriété avec les données publiques du propriétaire
 */
const enrichPropertyWithOwner = async (
  property: Database['public']['Tables']['properties']['Row']
): Promise<PropertyWithOwnerScore> => {
  if (!property.owner_id) {
    return {
      ...property,
      owner_trust_score: null,
      owner_full_name: null,
      owner_avatar_url: null,
      owner_is_verified: null,
      // Backward compatibility for component code
      bedrooms_count: property.bedrooms,
      bathrooms_count: property.bathrooms,
      // Price field compatibility - standardized to monthly_rent
      price: property.monthly_rent || property.price,
      monthly_rent: property.monthly_rent || property.price,
    } as PropertyWithOwnerScore;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, trust_score, is_verified')
    .eq('id', property.owner_id)
    .single();

  if (error || !data) {
    return {
      ...property,
      owner_trust_score: null,
      owner_full_name: null,
      owner_avatar_url: null,
      owner_is_verified: null,
    } as PropertyWithOwnerScore;
  }

  return {
    ...property,
    owner_trust_score: data.trust_score ?? null,
    owner_full_name: data.full_name ?? null,
    owner_avatar_url: data.avatar_url ?? null,
    owner_is_verified: data.is_verified ?? null,
  } as PropertyWithOwnerScore;
};

/**
 * API de gestion des propriétés avec cache optimisé
 */
export const propertyApi = {
  /**
   * Récupère toutes les propriétés avec filtres optionnels (avec cache)
   */
  getAll: async (filters?: PropertyFilters) => {
    const cacheKey = `${CACHE_PREFIX}all_${JSON.stringify(filters || {})}`;
    const cached = cacheService.get<PropertyWithOwnerScore[]>(cacheKey);

    if (cached) {
      return { data: cached, error: null };
    }

    let query = supabase.from('properties').select('*').order('created_at', { ascending: false });

    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    if (filters?.type) {
      query = query.eq('property_type', filters.type);
    }

    if (filters?.minPrice !== undefined) {
      query = query.gte('monthly_rent', filters.minPrice);
    }

    if (filters?.maxPrice !== undefined) {
      query = query.lte('monthly_rent', filters.maxPrice);
    }

    if (filters?.minRooms !== undefined) {
      query = query.gte('bedrooms', filters.minRooms);
    }

    if (filters?.maxRooms !== undefined) {
      query = query.lte('bedrooms', filters.maxRooms);
    }

    if (filters?.minArea !== undefined) {
      query = query.gte('surface_area', filters.minArea);
    }

    if (filters?.maxArea !== undefined) {
      query = query.lte('surface_area', filters.maxArea);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data) {
      const enrichedData = await enrichPropertiesWithOwners(data);
      cacheService.set(cacheKey, enrichedData, CACHE_TTL_MINUTES);
      return { data: enrichedData, error: null };
    }

    return { data: [], error: null };
  },

  /**
   * Récupère une propriété par son ID (avec cache)
   */
  getById: async (id: string) => {
    const cacheKey = `${CACHE_PREFIX}id_${id}`;
    const cached = cacheService.get<PropertyWithOwnerScore>(cacheKey);

    if (cached) {
      return { data: cached, error: null };
    }

    const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();

    if (error) throw error;

    if (data) {
      const enrichedData = await enrichPropertyWithOwner(data);
      cacheService.set(cacheKey, enrichedData, CACHE_TTL_MINUTES);
      return { data: enrichedData, error: null };
    }

    return { data: null, error: null };
  },

  /**
   * Récupère les propriétés d'un propriétaire (avec cache)
   */
  getByOwnerId: async (ownerId: string) => {
    const cacheKey = `${CACHE_PREFIX}owner_${ownerId}`;
    const cached = cacheService.get<PropertyWithOwnerScore[]>(cacheKey);

    if (cached) {
      return { data: cached, error: null };
    }

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data) {
      const enrichedData = await enrichPropertiesWithOwners(data);
      cacheService.set(cacheKey, enrichedData, CACHE_TTL_MINUTES);
      return { data: enrichedData, error: null };
    }

    return { data: [], error: null };
  },

  /**
   * Récupère les propriétés en vedette (avec cache)
   */
  getFeatured: async () => {
    return withErrorHandling(async () => {
      const cacheKey = `${CACHE_PREFIX}featured`;
      const cached = cacheService.get<PropertyWithOwnerScore[]>(cacheKey);

      // Vérifier si le cache contient des données complètes (avec ansut_verified)
      // Si le champ est manquant, c'est que le cache est obsolète (avant migration)
      const hasMissingFields = cached?.some(
        (p) => p.ansut_verified === undefined || !('ansut_verified' in p)
      );

      if (cached && cached.length > 0 && !hasMissingFields) {
        return cached;
      }

      // Use public view for anonymous access
      // The supabase client will automatically handle public access with the anon role
      const { data, error } = await supabase
        .from('public_properties_view')
        .select('*')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      if (data) {
        const enrichedData = await enrichPropertiesWithOwners(data);
        // Ne pas figer un cache vide : on veut pouvoir rafraîchir si de nouvelles annonces arrivent
        if (enrichedData.length > 0) {
          cacheService.set(cacheKey, enrichedData, CACHE_TTL_MINUTES);
        } else {
          cacheService.remove(cacheKey);
        }
        return enrichedData;
      }

      return [];
    }, 'Erreur lors du chargement des propriétés en vedette');
  },

  /**
   * Crée une nouvelle propriété et invalide le cache (sécurisé)
   */
  create: async (property: PropertyInsert) => {
    // Vérifier que l'utilisateur a la permission de créer une propriété
    await requirePermission('canCreateProperty')();

    const { data, error } = await supabase.from('properties').insert(property).select().single();

    if (error) throw error;

    cacheService.invalidatePattern(CACHE_PREFIX);

    return { data, error: null };
  },

  /**
   * Met à jour une propriété et invalide le cache (sécurisé)
   */
  update: async (id: string, updates: PropertyUpdate) => {
    // Vérifier la permission ET la propriété
    await requirePermission('canEditProperty')();
    await requireOwnership('property')(id);

    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    cacheService.remove(`${CACHE_PREFIX}id_${id}`);
    cacheService.invalidatePattern(CACHE_PREFIX);

    return { data, error: null };
  },

  /**
   * Supprime une propriété et invalide le cache (sécurisé)
   */
  delete: async (id: string) => {
    // Vérifier la permission ET la propriété
    await requirePermission('canDeleteProperty')();
    await requireOwnership('property')(id);

    const { error } = await supabase.from('properties').delete().eq('id', id);

    if (error) throw error;

    cacheService.remove(`${CACHE_PREFIX}id_${id}`);
    cacheService.invalidatePattern(CACHE_PREFIX);

    return { data: null, error: null };
  },

  /**
   * Recherche de propriétés par texte (avec cache)
   */
  search: async (searchTerm: string) => {
    const cacheKey = `${CACHE_PREFIX}search_${searchTerm}`;
    const cached = cacheService.get<PropertyWithOwnerScore[]>(cacheKey);

    if (cached) {
      return { data: cached, error: null };
    }

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .or(
        `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`
      )
      .eq('status', 'disponible')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data) {
      const enrichedData = await enrichPropertiesWithOwners(data);
      cacheService.set(cacheKey, enrichedData, CACHE_TTL_MINUTES);
      return { data: enrichedData, error: null };
    }

    return { data: [], error: null };
  },

  /**
   * Compte le nombre de propriétés avec filtres
   */
  count: async (filters?: PropertyFilters) => {
    let query = supabase.from('properties').select('*', { count: 'exact', head: true });

    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    if (filters?.type) {
      query = query.eq('property_type', filters.type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { count, error } = await query;

    if (error) throw error;
    return { data: count, error: null };
  },
};
