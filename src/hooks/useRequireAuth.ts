import { useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useAuthModal } from '@/contexts/AuthModalContext';

/**
 * Hook pour protéger les actions sensibles
 * Retourne une fonction qui vérifie l'authentification et ouvre le modal si nécessaire
 *
 * @example
 * const { requireAuth } = useRequireAuth();
 *
 * const handleSaveFavorite = () => {
 *   requireAuth(() => {
 *     // Action sensible ici
 *     saveFavorite(propertyId);
 *   });
 * };
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

  const requireAuth = useCallback(
    (action: () => void, message?: string) => {
      if (user) {
        action();
      } else {
        openAuthModal(message);
      }
    },
    [user, openAuthModal]
  );

  const isAuthenticated = !!user;

  return {
    requireAuth,
    isAuthenticated,
    user,
  };
}

export default useRequireAuth;
