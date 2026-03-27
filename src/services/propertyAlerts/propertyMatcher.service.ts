/**
 * Service de matching entre les propriétés et les recherches sauvegardées
 * Détermine si une propriété correspond aux critères d'une recherche sauvegardée
 */

import type { Property } from '@/integrations/supabase/types';

export interface SearchCriteria {
  city?: string;
  cities?: string[];
  property_type?: string | string[];
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_surface?: number;
  max_surface?: number;
  furnished?: boolean;
  balcony?: boolean;
  parking?: boolean;
  garden?: boolean;
  amenities?: string[];
  // Autres critères possibles
  [key: string]: unknown;
}

/**
 * Vérifie si une propriété correspond aux critères de recherche
 */
export function matchesSearchCriteria(property: Property, criteria: SearchCriteria): boolean {
  // Vérifier la disponibilité du bien
  if (property.status !== 'available') {
    return false;
  }

  // Vérifier la ville
  if (criteria.city && !matchesCity(property, criteria.city)) {
    return false;
  }
  if (criteria.cities && criteria.cities.length > 0 && !matchesCities(property, criteria.cities)) {
    return false;
  }

  // Vérifier le type de bien
  if (criteria.property_type && !matchesPropertyType(property, criteria.property_type)) {
    return false;
  }

  // Vérifier le prix
  if (!matchesPrice(property, criteria.min_price, criteria.max_price)) {
    return false;
  }

  // Vérifier le nombre de chambres
  if (!matchesBedrooms(property, criteria.min_bedrooms, criteria.max_bedrooms)) {
    return false;
  }

  // Vérifier la surface
  if (!matchesSurface(property, criteria.min_surface, criteria.max_surface)) {
    return false;
  }

  // Vérifier si meublé
  if (criteria.furnished !== undefined && property.furnished !== criteria.furnished) {
    return false;
  }

  // Vérifier le balcon
  if (criteria.balcony && !property.has_balcony) {
    return false;
  }

  // Vérifier le parking
  if (criteria.parking && !property.has_parking) {
    return false;
  }

  // Vérifier le jardin
  if (criteria.garden && !property.has_garden) {
    return false;
  }

  // Vérifier les équipements
  if (criteria.amenities && criteria.amenities.length > 0) {
    const propertyAmenities = property.amenities as string[] | null;
    if (!propertyAmenities) {
      return false;
    }
    const hasAllAmenities = criteria.amenities.every((amenity) =>
      propertyAmenities.includes(amenity)
    );
    if (!hasAllAmenities) {
      return false;
    }
  }

  return true;
}

/**
 * Vérifie si la ville correspond (insensible à la casse et aux accents)
 */
function matchesCity(property: Property, city: string): boolean {
  const propertyCity = normalizeString(property.city);
  const searchCity = normalizeString(city);
  return propertyCity === searchCity || propertyCity.includes(searchCity);
}

/**
 * Vérifie si la ville est dans la liste des villes
 */
function matchesCities(property: Property, cities: string[]): boolean {
  const propertyCity = normalizeString(property.city);
  return cities.some((city) => {
    const normalizedCity = normalizeString(city);
    return propertyCity === normalizedCity || propertyCity.includes(normalizedCity);
  });
}

/**
 * Vérifie si le type de bien correspond
 */
function matchesPropertyType(property: Property, propertyType: string | string[]): boolean {
  if (Array.isArray(propertyType)) {
    return propertyType.includes(property.property_type);
  }
  return property.property_type === propertyType;
}

/**
 * Vérifie si le prix correspond aux bornes min/max
 */
function matchesPrice(property: Property, minPrice?: number, maxPrice?: number): boolean {
  const price = property.monthly_rent || property.price || 0;

  if (minPrice !== undefined && price < minPrice) {
    return false;
  }

  if (maxPrice !== undefined && price > maxPrice) {
    return false;
  }

  return true;
}

/**
 * Vérifie si le nombre de chambres correspond
 */
function matchesBedrooms(property: Property, minBedrooms?: number, maxBedrooms?: number): boolean {
  const bedrooms = property.bedrooms || 0;

  if (minBedrooms !== undefined && bedrooms < minBedrooms) {
    return false;
  }

  if (maxBedrooms !== undefined && bedrooms > maxBedrooms) {
    return false;
  }

  return true;
}

/**
 * Vérifie si la surface correspond aux bornes min/max
 */
function matchesSurface(property: Property, minSurface?: number, maxSurface?: number): boolean {
  const surface = property.surface_area || property.surface || 0;

  if (minSurface !== undefined && surface < minSurface) {
    return false;
  }

  if (maxSurface !== undefined && surface > maxSurface) {
    return false;
  }

  return true;
}

/**
 * Normalise une chaîne pour la comparaison (insensible à la casse et aux accents)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .trim();
}

/**
 * Trouve toutes les recherches sauvegardées qui correspondent à une propriété
 */
export function findMatchingSearches(
  property: Property,
  savedSearches: Array<{ id: string; user_id: string; name: string; search_criteria: SearchCriteria; alert_enabled: boolean }>
): Array<{ searchId: string; userId: string; searchName: string }> {
  return savedSearches
    .filter((search) => search.alert_enabled && matchesSearchCriteria(property, search.search_criteria))
    .map((search) => ({
      searchId: search.id,
      userId: search.user_id,
      searchName: search.name,
    }));
}

/**
 * Calcule un score de pertinence pour un matching
 * Plus le score est élevé, plus la correspondance est précise
 */
export function calculateMatchScore(property: Property, criteria: SearchCriteria): number {
  let score = 0;

  // Prix dans la fourchette idéale (±10% des bornes)
  const price = property.monthly_rent || property.price || 0;
  if (criteria.min_price && criteria.max_price) {
    const range = criteria.max_price - criteria.min_price;
    const idealMin = criteria.min_price + range * 0.1;
    const idealMax = criteria.max_price - range * 0.1;
    if (price >= idealMin && price <= idealMax) {
      score += 20;
    }
  }

  // Type de bien exact
  if (criteria.property_type === property.property_type) {
    score += 15;
  }

  // Nombre de chambres exact
  if (criteria.min_bedrooms !== undefined && property.bedrooms === criteria.min_bedrooms) {
    score += 10;
  }

  // Tous les équipements correspondants
  if (criteria.amenities && criteria.amenities.length > 0) {
    const propertyAmenities = property.amenities as string[] | null;
    const matchCount = criteria.amenities.filter((amenity) =>
      propertyAmenities?.includes(amenity)
    ).length;
    score += (matchCount / criteria.amenities.length) * 15;
  }

  // Équipements optionnels
  if (criteria.furnished !== undefined && property.furnished === criteria.furnished) {
    score += 10;
  }
  if (criteria.balcony && property.has_balcony) {
    score += 5;
  }
  if (criteria.parking && property.has_parking) {
    score += 5;
  }
  if (criteria.garden && property.has_garden) {
    score += 5;
  }

  return Math.min(100, score);
}
