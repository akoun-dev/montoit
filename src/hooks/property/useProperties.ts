import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyApi } from '../../features/property/services/property.api';
import type { Database } from '@/shared/lib/database.types';

type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export function useProperties(filters?: any) {
  return useQuery({
    queryKey: ['properties', filters],
    queryFn: () => propertyApi.getAll(filters),
  });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      if (!id) return { data: null, error: null };
      return propertyApi.getById(id);
    },
    enabled: !!id,
  });
}

export function useOwnerProperties(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['properties', 'owner', ownerId],
    queryFn: () =>
      ownerId ? propertyApi.getByOwnerId(ownerId) : Promise.resolve({ data: [], error: null }),
    enabled: !!ownerId,
  });
}

export function useFeaturedProperties() {
  return useQuery({
    queryKey: ['properties', 'featured'],
    queryFn: async () => {
      const { data, error } = await propertyApi.getFeatured();
      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (property: PropertyInsert) => propertyApi.create(property),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: PropertyUpdate }) =>
      propertyApi.update(id, updates),
    onSuccess: (data) => {
      if (data.data) {
        queryClient.invalidateQueries({ queryKey: ['property', data.data.id] });
        queryClient.invalidateQueries({ queryKey: ['properties'] });
      }
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => propertyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

// incrementViewCount peut être ajouté dans propertyApi si nécessaire
