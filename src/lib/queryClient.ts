import { QueryClient } from '@tanstack/react-query';
import { logger } from '@/services/logger';

// ✅ SÉCURITÉ : Liste des clés de cache sensibles à ne JAMAIS persister
const SENSITIVE_QUERY_KEYS = [
  'user_verifications',
  'admin_audit_logs',
  'sensitive_data_access_log',
  'admin_get_guest_messages',
  'user_phone',
  'payment_methods',
];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Performance optimizations
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
      
      // ✅ SÉCURITÉ : Ne pas refetch automatiquement sur focus pour éviter les requêtes inutiles
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      
      // Retry logic intelligent
      retry: (failureCount, error: any) => {
        // ✅ SÉCURITÉ : Ne pas retry sur les erreurs d'authentification
        if (error?.status === 401 || error?.status === 403) {
          logger.warn('Erreur d\'authentification détectée', { error });
          return false;
        }
        
        // Ne pas retry sur les 404
        if (error?.status === 404) return false;
        
        return failureCount < 2;
      },
    },
    mutations: {
      // ✅ SÉCURITÉ : Logger toutes les mutations pour audit
      onSuccess: (data, variables, context) => {
        logger.info('Mutation successful', {
          context: context || 'unknown',
          // Ne pas logger les données sensibles
        });
      },
      onError: (error: any, variables, context) => {
        logger.error('Mutation failed', {
          message: error?.message,
          context: context || 'unknown',
        });
      },
    },
  },
});

// ✅ SÉCURITÉ : Fonction pour nettoyer le cache des données sensibles
export const clearSensitiveCache = () => {
  SENSITIVE_QUERY_KEYS.forEach(key => {
    queryClient.removeQueries({ queryKey: [key] });
  });
  logger.info('Sensitive cache cleared');
};

// ✅ SÉCURITÉ : Nettoyer le cache lors de la déconnexion
export const clearCacheOnLogout = () => {
  queryClient.clear();
  logger.info('All cache cleared on logout');
};
