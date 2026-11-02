import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BusinessRule {
  key: string;
  name: string;
  category: string;
  type: 'number' | 'boolean' | 'percentage' | 'json';
  value: number | boolean | Record<string, unknown> | null;
  description: string | null;
  isEnabled: boolean;
  minValue: number | null;
  maxValue: number | null;
}

/**
 * Hook pour récupérer une règle métier unique
 */
export function useBusinessRule(ruleKey: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['business-rule', ruleKey],
    queryFn: async (): Promise<BusinessRule | null> => {
      const response = await fetch(
        `${import.meta.env['VITE_SUPABASE_URL']}/functions/v1/get-business-rule?key=${ruleKey}`,
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'],
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch business rule');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  // Helper to get typed value
  const getValue = <T = number | boolean>(): T | null => {
    return (data?.value ?? null) as T | null;
  };

  return {
    rule: data,
    value: data?.value ?? null,
    isEnabled: data?.isEnabled ?? false,
    isLoading,
    error,
    refetch,
    getValue,
  };
}

/**
 * Hook pour récupérer plusieurs règles par catégorie
 */
export function useBusinessRulesByCategory(category: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['business-rules', 'category', category],
    queryFn: async (): Promise<BusinessRule[]> => {
      const response = await fetch(
        `${import.meta.env['VITE_SUPABASE_URL']}/functions/v1/get-business-rule?category=${category}`,
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'],
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch business rules');
      }

      const result = await response.json();
      return result.rules || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    rules: data ?? [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook pour récupérer toutes les règles (admin)
 */
export function useAllBusinessRules() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['business-rules', 'all'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env['VITE_SUPABASE_URL']}/functions/v1/manage-business-rules`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'],
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch business rules');
      }

      const result = await response.json();
      return result.rules || [];
    },
    staleTime: 30 * 1000, // 30 seconds for admin
  });

  return {
    rules: data ?? [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook pour mettre à jour une règle (admin)
 */
export function useUpdateBusinessRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
      isEnabled,
    }: {
      key: string;
      value?: number | boolean | Record<string, unknown>;
      isEnabled?: boolean;
    }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env['VITE_SUPABASE_URL']}/functions/v1/manage-business-rules`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'],
          },
          body: JSON.stringify({ key, value, is_enabled: isEnabled }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update rule');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business-rules'] });
      queryClient.invalidateQueries({ queryKey: ['business-rule', variables.key] });
    },
  });
}

/**
 * Hook pour activer/désactiver une règle (admin)
 */
export function useToggleBusinessRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, isEnabled }: { key: string; isEnabled: boolean }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env['VITE_SUPABASE_URL']}/functions/v1/manage-business-rules`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'],
          },
          body: JSON.stringify({ key, is_enabled: isEnabled }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle rule');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business-rules'] });
      queryClient.invalidateQueries({ queryKey: ['business-rule', variables.key] });
    },
  });
}
