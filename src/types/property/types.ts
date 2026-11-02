/**
 * Types TypeScript pour la feature property
 */

import type { Database } from '@/shared/lib/database.types';

// Types de base depuis la base de données
export type Property = Database['public']['Tables']['properties']['Row'];
export type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
export type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

// Types étendus pour l'application
export interface PropertyWithOwner extends Property {
  owner: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    identity_verified: boolean;
  };
}

export interface PropertyWithOwnerScore extends Property {
  owner_trust_score?: number | null;
  owner_full_name?: string | null;
  owner_avatar_url?: string | null;
  owner_is_verified?: boolean | null;
  // Note: Les colonnes bedrooms et bathrooms sont maintenant directement disponibles
}

export interface PropertyFilters {
  city?: string;
  type?: 'apartment' | 'house' | 'studio' | 'villa' | 'land' | 'commercial';
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  maxRooms?: number;
  minArea?: number;
  maxArea?: number;
  status?: 'available' | 'rented' | 'sold' | 'draft';
  featured?: boolean;
  searchTerm?: string;
}

export interface PropertyStats {
  total: number;
  available: number;
  rented: number;
  sold: number;
  draft: number;
  totalValue: number;
  averagePrice: number;
}

export interface PropertyFormData {
  title: string;
  description: string;
  type: 'apartment' | 'house' | 'studio' | 'villa' | 'land' | 'commercial';
  price: number;
  address: string;
  city: string;
  neighborhood?: string;
  area: number;
  rooms?: number;
  bathrooms?: number;
  floor?: number;
  total_floors?: number;
  parking?: boolean;
  furnished?: boolean;
  amenities?: string[];
  images?: string[];
  video_url?: string;
  latitude?: number;
  longitude?: number;
  status: 'available' | 'rented' | 'sold' | 'draft';
  featured?: boolean;
}

export type PropertyStatus = 'available' | 'rented' | 'sold' | 'draft';
export type PropertyType = 'apartment' | 'house' | 'studio' | 'villa' | 'land' | 'commercial';

export interface PropertyAmenity {
  id: string;
  name: string;
  icon: string;
  category: 'comfort' | 'security' | 'services';
}

export interface PropertyLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  neighborhood?: string;
}
