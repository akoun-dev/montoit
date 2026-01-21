/**
 * Hook useUserRoles - Gestion centralisée des rôles utilisateur
 * Vérifie les rôles via Supabase RPC get_user_roles()
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { isLocalSupabase } from '@/shared/utils/environment';

// Flag global pour mémoriser l'absence du RPC et éviter de le rappeler
const userRolesRpcSkipped = { value: false }; // activer la détection des rôles (trust agent, etc.)

// Type des rôles disponibles (correspondant à l'enum app_role en DB)
export type AppRole = 'admin' | 'moderator' | 'user' | 'trust_agent';

export interface UseUserRolesReturn {
  // État
  roles: AppRole[];
  loading: boolean;
  error: Error | null;

  // Méthodes de vérification
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  hasAllRoles: (roles: AppRole[]) => boolean;

  // Raccourcis pratiques
  isAdmin: boolean;
  isModerator: boolean;
  isTrustAgent: boolean;
  isUser: boolean;

  // Actions
  refreshRoles: () => Promise<void>;
}

export function useUserRoles(): UseUserRolesReturn {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Flag module-level pour éviter de spammer un RPC manquant
  const skipRpc = useMemo(() => userRolesRpcSkipped, []);

  // Fonction de chargement des rôles
  const fetchRoles = useCallback(async () => {
    // Pas d'utilisateur connecté
    if (!user?.id) {
      setRoles([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Si on est en environnement local, on saute l'appel RPC et on retourne un rôle par défaut
    if (isLocalSupabase()) {
      skipRpc.value = true;
      userRolesRpcSkipped.value = true;
      // En local, on peut définir un rôle par défaut (ex: 'user')
      // Pour le développement, on peut aussi simuler d'autres rôles via une variable d'environnement
      const defaultRole: AppRole = 'user';
      setRoles([defaultRole]);
      setLoading(false);
      setError(null);
      return;
    }

    // Si on a déjà détecté que le RPC est absent, ne rien appeler
    if (skipRpc.value) {
      setRoles([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_user_roles', {
        _user_id: user.id,
      });

      if (rpcError) {
        // Fonction absente : fallback silencieux
        if (rpcError.message?.includes('Could not find the function')) {
          skipRpc.value = true;
          userRolesRpcSkipped.value = true;
          setRoles([]);
          setError(null);
          return;
        }
        throw new Error(rpcError.message);
      }

      // Cast sécurisé des rôles retournés
      const userRoles = (data as AppRole[]) || [];
      setRoles(userRoles);
    } catch (err) {
      console.warn('Erreur lors du chargement des rôles:', err);
      setError(err instanceof Error ? err : new Error('Erreur inconnue'));
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, skipRpc]);

  // Charger les rôles au montage et quand l'utilisateur change
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Méthodes de vérification mémorisées
  const hasRole = useCallback((role: AppRole): boolean => roles.includes(role), [roles]);

  const hasAnyRole = useCallback(
    (checkRoles: AppRole[]): boolean => checkRoles.some((role) => roles.includes(role)),
    [roles]
  );

  const hasAllRoles = useCallback(
    (checkRoles: AppRole[]): boolean => checkRoles.every((role) => roles.includes(role)),
    [roles]
  );

  // Propriétés calculées mémorisées
  const computedValues = useMemo(
    () => ({
      isAdmin: roles.includes('admin'),
      isModerator: roles.includes('moderator'),
      isTrustAgent: roles.includes('trust_agent'),
      isUser: roles.includes('user'),
    }),
    [roles]
  );

  return {
    roles,
    loading,
    error,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    ...computedValues,
    refreshRoles: fetchRoles,
  };
}

export default useUserRoles;
