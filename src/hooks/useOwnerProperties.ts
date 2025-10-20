import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import type { Property } from '@/types';

/**
 * Mock properties for development
 */
const getMockOwnerProperties = (): Property[] => [
  {
    id: 'mock-1',
    title: 'Appartement 2 pièces Cocody Riviera',
    description: 'Bel appartement moderne dans quartier résidentiel',
    property_type: 'appartement',
    monthly_rent: 150000,
    city: 'Abidjan',
    neighborhood: 'Cocody',
    surface_area: 65,
    bedrooms: 2,
    bathrooms: 1,
    has_parking: true,
    has_ac: true,
    has_garden: false,
    is_furnished: true,
    status: 'disponible',
    main_image: 'https://picsum.photos/seed/apartment-cocody-1/400/300.jpg',
    images: [
      'https://picsum.photos/seed/apartment-cocody-1/400/300.jpg',
      'https://picsum.photos/seed/apartment-cocody-2/400/300.jpg',
      'https://picsum.photos/seed/apartment-cocody-3/400/300.jpg'
    ],
    latitude: 5.3599,
    longitude: -4.0305,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner_id: '550e8400-e29b-41d4-a716-446655440002',
    deposit_amount: 300000,
    charges_amount: 15000,
    view_count: 156,
    favorite_count: 23,
    is_featured: true,
    is_verified: true
  },
  {
    id: 'mock-3',
    title: 'Villa 4 pièces Marcory',
    description: 'Spacieuse villa avec jardin et piscine',
    property_type: 'villa',
    monthly_rent: 350000,
    city: 'Abidjan',
    neighborhood: 'Marcory',
    surface_area: 180,
    bedrooms: 4,
    bathrooms: 3,
    has_parking: true,
    has_ac: true,
    has_garden: true,
    is_furnished: false,
    status: 'loué',
    main_image: 'https://picsum.photos/seed/villa-marcory-1/400/300.jpg',
    images: [
      'https://picsum.photos/seed/villa-marcory-1/400/300.jpg',
      'https://picsum.photos/seed/villa-marcory-2/400/300.jpg',
      'https://picsum.photos/seed/villa-marcory-3/400/300.jpg',
      'https://picsum.photos/seed/villa-marcory-4/400/300.jpg'
    ],
    latitude: 5.2833,
    longitude: -4.0167,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner_id: '550e8400-e29b-41d4-a716-446655440002',
    deposit_amount: 700000,
    charges_amount: 50000,
    view_count: 234,
    favorite_count: 45,
    is_featured: true,
    is_verified: true
  },
  {
    id: 'mock-4',
    title: 'Duplex 3 pièces Plateau',
    description: 'Duplex moderne en plein centre-ville',
    property_type: 'duplex',
    monthly_rent: 250000,
    city: 'Abidjan',
    neighborhood: 'Plateau',
    surface_area: 120,
    bedrooms: 3,
    bathrooms: 2,
    has_parking: true,
    has_ac: true,
    has_garden: false,
    is_furnished: true,
    status: 'disponible',
    main_image: 'https://picsum.photos/seed/duplex-plateau-1/400/300.jpg',
    images: [
      'https://picsum.photos/seed/duplex-plateau-1/400/300.jpg',
      'https://picsum.photos/seed/duplex-plateau-2/400/300.jpg',
      'https://picsum.photos/seed/duplex-plateau-3/400/300.jpg'
    ],
    latitude: 5.3599,
    longitude: -4.0305,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner_id: '550e8400-e29b-41d4-a716-446655440002',
    deposit_amount: 500000,
    charges_amount: 30000,
    view_count: 178,
    favorite_count: 34,
    is_featured: false,
    is_verified: true
  }
];

/**
 * Hook to fetch properties owned by a specific user
 */
export const useOwnerProperties = (ownerId: string) => {
  return useQuery({
    queryKey: ['owner-properties', ownerId],
    queryFn: async () => {
      if (!ownerId) return [];

      try {
        // Try to fetch from database first
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false });

        if (error) {
          logger.logError(error, { context: 'useOwnerProperties', action: 'fetchOwnerProperties', ownerId });
          throw error;
        }

        // If no data in database or empty, return mock data
        if (!data || data.length === 0) {
          logger.warn('No owner properties found in database, using mock data', { ownerId });
          return getMockOwnerProperties();
        }

        return data as Property[];
      } catch (error) {
        logger.logError(error as Error, { context: 'useOwnerProperties', action: 'fallbackToMock', ownerId });
        // Fallback to mock data if database query fails
        return getMockOwnerProperties();
      }
    },
    enabled: !!ownerId,
    staleTime: 30_000, // 30 seconds
    retry: 2,
  });
};