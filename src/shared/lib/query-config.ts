/**
 * Configuration optimisée pour React Query
 *
 * Cette configuration améliore les performances en :
 * - Augmentant le temps de cache (staleTime)
 * - Réduisant les refetch automatiques
 * - Optimisant le garbage collection
 */

import { QueryClient } from '@tanstack/react-query';

export const queryConfig = {
  defaultOptions: {
    queries: {
      // Données considérées comme fraîches pendant 5 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Garder les données en cache pendant 10 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)

      // Refetch automatique désactivé pour économiser les requêtes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,

      // Retry configuration
      retry: 1,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry pour les mutations critiques
      retry: 1,
    },
  },
};

/**
 * Créer un QueryClient avec la configuration optimisée
 */
export function createQueryClient() {
  return new QueryClient(queryConfig);
}

/**
 * Configuration spécifique pour les données en temps réel
 */
export const realtimeQueryConfig = {
  staleTime: 0, // Toujours considérer comme périmé
  gcTime: 5 * 60 * 1000, // 5 minutes
  refetchInterval: 5000, // Refetch toutes les 5 secondes
  refetchOnWindowFocus: true,
};

/**
 * Configuration pour les données statiques (rarement modifiées)
 */
export const staticQueryConfig = {
  staleTime: 30 * 60 * 1000, // 30 minutes
  gcTime: 60 * 60 * 1000, // 1 heure
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
};

/**
 * Configuration pour les données utilisateur (profil, préférences)
 */
export const userQueryConfig = {
  staleTime: 10 * 60 * 1000, // 10 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
};

/**
 * Configuration pour les listes paginées
 */
export const paginatedQueryConfig = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: false,
  keepPreviousData: true, // Garde les données précédentes pendant le chargement
};

/**
 * Préfixes de clés de requête pour une meilleure organisation
 */
export const queryKeys = {
  properties: {
    all: ['properties'] as const,
    lists: () => [...queryKeys.properties.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.properties.lists(), { filters }] as const,
    details: () => [...queryKeys.properties.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.properties.details(), id] as const,
    featured: () => [...queryKeys.properties.all, 'featured'] as const,
  },
  contracts: {
    all: ['contracts'] as const,
    lists: () => [...queryKeys.contracts.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.contracts.lists(), { filters }] as const,
    details: () => [...queryKeys.contracts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contracts.details(), id] as const,
  },
  messages: {
    all: ['messages'] as const,
    conversations: () => [...queryKeys.messages.all, 'conversations'] as const,
    conversation: (id: string) => [...queryKeys.messages.conversations(), id] as const,
    unread: (userId: string) => [...queryKeys.messages.all, 'unread', userId] as const,
  },
  verification: {
    all: ['verification'] as const,
    user: (userId: string) => [...queryKeys.verification.all, 'user', userId] as const,
    pending: () => [...queryKeys.verification.all, 'pending'] as const,
  },
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    profile: (userId: string) => [...queryKeys.auth.all, 'profile', userId] as const,
  },
  payments: {
    all: ['payments'] as const,
    lists: () => [...queryKeys.payments.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.payments.lists(), { filters }] as const,
    details: () => [...queryKeys.payments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.payments.details(), id] as const,
    pending: () => [...queryKeys.payments.all, 'pending'] as const,
  },
} as const;
