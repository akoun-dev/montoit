/**
 * RoleContext - Gestion des rôles multiples et du rôle actif
 *
 * Ce contexte permet aux utilisateurs ayant plusieurs rôles (propriétaire + locataire, etc.)
 * de basculer entre leurs différentes casquettes.
 *
 * Fonctionnalités :
 * - Détection automatique des rôles disponibles basée sur les données utilisateur
 * - Persistance du rôle actif dans localStorage
 * - Changement de rôle avec mise à jour du profil
 * - Redirection vers le dashboard approprié
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/shared/lib/logger';

// Types de rôles business disponibles
export type BusinessRole = 'tenant' | 'owner' | 'agency';

// Interface pour un rôle disponible
export interface AvailableRole {
  id: BusinessRole;
  label: string;
  icon: string;
  frenchLabel: string;
}

// Configuration des rôles
const ROLE_CONFIG: Record<BusinessRole, AvailableRole> = {
  tenant: {
    id: 'tenant',
    label: 'Locataire',
    icon: 'key',
    frenchLabel: 'locataire',
  },
  owner: {
    id: 'owner',
    label: 'Propriétaire',
    icon: 'home',
    frenchLabel: 'proprietaire',
  },
  agency: {
    id: 'agency',
    label: 'Agence',
    icon: 'building',
    frenchLabel: 'agence',
  },
};

// Clé localStorage pour la persistance
const ACTIVE_ROLE_KEY = 'montoit_active_role';

interface RoleContextType {
  // Rôle actuellement actif
  activeRole: BusinessRole | null;
  // Liste des rôles disponibles pour l'utilisateur
  availableRoles: AvailableRole[];
  // Chargement de la détection des rôles
  loadingRoles: boolean;
  // Changer de rôle
  switchRole: (role: BusinessRole) => Promise<void>;
  // Obtenir le label d'un rôle
  getRoleLabel: (role: BusinessRole) => string;
  // Vérifier si un rôle est disponible
  hasRole: (role: BusinessRole) => boolean;
  // Vérifier si le rôle est actif
  isRoleActive: (role: BusinessRole) => boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, profile, updateProfile } = useAuth();

  const [activeRole, setActiveRole] = useState<BusinessRole | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  /**
   * Détecte les rôles disponibles pour l'utilisateur
   * Basé sur les données : propriétés possédées, baux actifs, ET le user_type du profil
   */
  const detectAvailableRoles = useCallback(async (): Promise<BusinessRole[]> => {
    if (!user?.id) return [];

    try {
      const roles: BusinessRole[] = [];
      let roleFromUserType: BusinessRole | null = null;

      // 1. D'abord, vérifier le user_type du profil pour déterminer le rôle de base
      if (profile?.user_type) {
        const userType = profile.user_type.toLowerCase();
        if (userType.includes('tenant') || userType.includes('locataire')) {
          roleFromUserType = 'tenant';
        } else if (userType.includes('owner') || userType.includes('proprietaire')) {
          roleFromUserType = 'owner';
        } else if (userType.includes('agency') || userType.includes('agence') || userType.includes('agent')) {
          roleFromUserType = 'agency';
        }
      }

      // 2. Ajouter le rôle basé sur user_type si pas encore présent
      if (roleFromUserType && !roles.includes(roleFromUserType)) {
        roles.push(roleFromUserType);
      }

      // 3. Vérifier si l'utilisateur a des propriétés (ajouter rôle owner si pas déjà présent)
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      if (!propertiesError && properties && (properties as any).count > 0) {
        if (!roles.includes('owner')) {
          roles.push('owner');
        }
      }

      // 4. Vérifier si l'utilisateur a des baux actifs en tant que locataire
      const { data: tenantLeases, error: tenantLeasesError } = await supabase
        .from('lease_contracts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', user.id)
        .in('status', ['actif', 'en_attente_signature']);

      if (!tenantLeasesError && tenantLeases && (tenantLeases as any).count > 0) {
        if (!roles.includes('tenant')) {
          roles.push('tenant');
        }
      }

      logger.info('Detected available roles', { userId: user.id, roles, user_type: profile?.user_type });
      return roles;
    } catch (error) {
      logger.error('Error detecting available roles', error instanceof Error ? error : undefined, { userId: user.id });
      return [];
    }
  }, [user?.id, profile]);

  /**
   * Initialise le rôle actif depuis localStorage ou depuis le profil
   */
  const initializeActiveRole = useCallback(async () => {
    if (!profile) return;

    // 1. Essayer de récupérer depuis localStorage
    const storedRole = localStorage.getItem(ACTIVE_ROLE_KEY) as BusinessRole | null;

    // 2. Détecter les rôles disponibles
    const detectedRoles = await detectAvailableRoles();

    // 3. Si aucun rôle n'est détecté, utiliser le user_type comme fallback
    let rolesToUse = detectedRoles;
    if (detectedRoles.length === 0) {
      const userType = profile.user_type?.toLowerCase() || '';
      if (userType.includes('tenant') || userType.includes('locataire')) {
        rolesToUse = ['tenant'];
      } else if (userType.includes('owner') || userType.includes('proprietaire')) {
        rolesToUse = ['owner'];
      } else if (userType.includes('agency') || userType.includes('agence') || userType.includes('agent')) {
        rolesToUse = ['agency'];
      } else {
        logger.warn('No roles detected and no valid user_type', { userId: user?.id, user_type: profile.user_type });
        setLoadingRoles(false);
        return;
      }
      logger.info('Using fallback role from user_type', { userId: user?.id, roles: rolesToUse, user_type: profile.user_type });
    }

    // 4. Déterminer le rôle à activer
    let roleToActivate: BusinessRole;

    if (storedRole && rolesToUse.includes(storedRole)) {
      // Le rôle stocké est valide
      roleToActivate = storedRole;
    } else if (rolesToUse.length === 1) {
      // Un seul rôle disponible
      roleToActivate = rolesToUse[0]!;
    } else {
      // Plusieurs rôles : utiliser le user_type du profil comme défaut
      const userType = profile.user_type?.toLowerCase() || '';
      if (userType.includes('tenant') || userType.includes('locataire')) {
        roleToActivate = 'tenant';
      } else if (userType.includes('owner') || userType.includes('proprietaire')) {
        roleToActivate = 'owner';
      } else if (userType.includes('agency') || userType.includes('agence') || userType.includes('agent')) {
        roleToActivate = 'agency';
      } else {
        // Fallback : premier rôle détecté
        roleToActivate = rolesToUse[0]!;
      }
    }

    setActiveRole(roleToActivate);
    setAvailableRoles(rolesToUse.map(role => ROLE_CONFIG[role]));
    setLoadingRoles(false);
  }, [profile, detectAvailableRoles, user?.id]);

  /**
   * Change le rôle actif de l'utilisateur
   */
  const switchRole = useCallback(async (role: BusinessRole) => {
    if (!user || !profile) {
      logger.warn('Cannot switch role: user or profile not loaded');
      return;
    }

    // Vérifier que le rôle est disponible
    const isAvailable = availableRoles.some(r => r.id === role);
    if (!isAvailable) {
      logger.error('Role not available for user', undefined, { availableRoles });
      throw new Error(`Rôle ${role} non disponible pour cet utilisateur`);
    }

    try {
      // Mettre à jour le user_type dans le profil
      const frenchLabel = ROLE_CONFIG[role].frenchLabel;
      await updateProfile({ user_type: frenchLabel });

      // Mettre à jour l'état local
      setActiveRole(role);

      // Persister dans localStorage
      localStorage.setItem(ACTIVE_ROLE_KEY, role);

      logger.info('Role switched successfully', { userId: user.id, newRole: role });

      // Rediriger vers le dashboard approprié
      const dashboardRoutes: Record<BusinessRole, string> = {
        tenant: '/dashboard/locataire',
        owner: '/dashboard/proprietaire',
        agency: '/dashboard/agence',
      };

      window.location.href = dashboardRoutes[role];
    } catch (err) {
      logger.error('Error switching role', err instanceof Error ? err : undefined, { userId: user.id, role });
      throw err;
    }
  }, [user, profile, availableRoles, updateProfile]);

  /**
   * Retourne le label d'un rôle
   */
  const getRoleLabel = useCallback((role: BusinessRole): string => {
    return ROLE_CONFIG[role]?.label || role;
  }, []);

  /**
   * Vérifie si un rôle est disponible pour l'utilisateur
   */
  const hasRole = useCallback((role: BusinessRole): boolean => {
    return availableRoles.some(r => r.id === role);
  }, [availableRoles]);

  /**
   * Vérifie si un rôle est actuellement actif
   */
  const isRoleActive = useCallback((role: BusinessRole): boolean => {
    return activeRole === role;
  }, [activeRole]);

  // Effet d'initialisation
  useEffect(() => {
    console.log('[RoleContext] useEffect triggered:', { profile, user });
    if (profile && user) {
      initializeActiveRole();
    }
  }, [profile, user, initializeActiveRole]);

  const value: RoleContextType = {
    activeRole,
    availableRoles,
    loadingRoles,
    switchRole,
    getRoleLabel,
    hasRole,
    isRoleActive,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

/**
 * Hook pour détecter dynamiquement les rôles basés sur les données utilisateur
 * Utile pour les affichages contextuels sans changer le rôle actif
 */
export function useContextualRoles() {
  const { profile, user } = useAuth();
  const [hasProperties, setHasProperties] = useState(false);
  const [hasLeases, setHasLeases] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const detectContextualRoles = async () => {
      try {
        // Vérifier les propriétés
        const { data: properties } = await supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id);

        const hasProps = (properties as any)?.count > 0;
        setHasProperties(hasProps);

        // Vérifier les baux
        const { data: leases } = await supabase
          .from('lease_contracts')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', user.id)
          .in('status', ['actif', 'en_attente_signature']);

        const hasLeaseData = (leases as any)?.count > 0;
        setHasLeases(hasLeaseData);
      } catch (error) {
        logger.error('Error detecting contextual roles', error instanceof Error ? error : undefined);
      } finally {
        setLoading(false);
      }
    };

    detectContextualRoles();
  }, [user?.id]);

  return {
    hasProperties,
    hasLeases,
    loading,
    isOwner: hasProperties || profile?.user_type?.toLowerCase().includes('owner') ||
             profile?.user_type?.toLowerCase().includes('proprietaire'),
    isTenant: hasLeases || profile?.user_type?.toLowerCase().includes('tenant') ||
              profile?.user_type?.toLowerCase().includes('locataire'),
    isAgency: profile?.user_type?.toLowerCase().includes('agency') ||
              profile?.user_type?.toLowerCase().includes('agence') ||
              profile?.user_type?.toLowerCase().includes('agent'),
  };
}
