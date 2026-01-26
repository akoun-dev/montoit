/**
 * Hook useUserRoles - Gestion centralisée des rôles utilisateur
 *
 * Deux systèmes de rôles existent:
 * 1. user_type (business type) dans profiles: locataire, proprietaire, trust_agent, admin_ansut
 * 2. system roles dans user_roles table: admin, moderator, trust_agent, user
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/app/providers/AuthProvider";
import { isLocalSupabase } from "@/shared/utils/environment";

// Flag global pour mémoriser l'absence du RPC et éviter de le rappeler
const userRolesRpcSkipped = { value: false };

// Type user_type (business type) - stocké dans profiles.user_type
export type UserType =
  | "locataire"
  | "proprietaire"
  | "trust_agent"
  | "admin_ansut";

// Type system_role - stocké dans user_roles.role
export type SystemRole =
  | "admin"
  | "moderator"
  | "trust_agent"
  | "user";

export interface UseUserRolesReturn {
  // État - user_type depuis profiles
  userType: UserType | null;
  // État - system roles depuis user_roles
  systemRoles: SystemRole[];
  loading: boolean;
  error: Error | null;

  // Méthodes de vérification pour user_type
  hasUserType: (type: UserType) => boolean;
  // Méthodes de vérification pour system roles
  hasSystemRole: (role: SystemRole) => boolean;

  // Raccourcis pratiques
  isAdmin: boolean;       // admin_ansut (user_type) OU admin (system role)
  isModerator: boolean;   // moderator (system role)
  isTrustAgent: boolean;  // trust_agent (user_type ou system role)
  isUser: boolean;        // utilisateur standard (sans rôle spécial)

  // Actions
  refreshRoles: () => Promise<void>;
}

export function useUserRoles(): UseUserRolesReturn {
  const { user, profile } = useAuth();
  const [userType, setUserType] = useState<UserType | null>(null);
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const skipRpc = useMemo(() => userRolesRpcSkipped, []);

  const fetchRoles = useCallback(async () => {
    if (!user?.id) {
      setUserType(null);
      setSystemRoles([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Environnement local: rôles par défaut pour le développement
    if (isLocalSupabase()) {
      skipRpc.value = true;
      userRolesRpcSkipped.value = true;
      // Pour tester les pages admin en local
      console.log('[useUserRoles] Local environment - setting admin role');
      setUserType("admin_ansut");
      setSystemRoles(["admin"]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Récupérer le user_type depuis le RPC get_user_roles
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_user_roles", {
        _user_id: user.id,
      });

      if (rpcError) {
        if (
          rpcError.message?.includes("Could not find the function") ||
          rpcError.message?.includes("has no field")
        ) {
          skipRpc.value = true;
          userRolesRpcSkipped.value = true;
          // Utiliser le profile.user_type comme fallback
          const profileUserType = profile?.user_type as UserType | null;
          console.log('[useUserRoles] RPC failed, using profile.user_type as fallback:', profileUserType);
          setUserType(profileUserType || null);
          setLoading(false);
          setError(null);
          return;
        }
        throw new Error(rpcError.message);
      }

      // Le RPC retourne un tableau de user_type (business types)
      const userTypes = (rpcData as UserType[]) || [];
      const rpcUserType = userTypes[0] || null;

      // Utiliser le user_type du RPC ou fallback vers profile.user_type
      const finalUserType = rpcUserType || (profile?.user_type as UserType | null);
      console.log('[useUserRoles] User type determined:', {
        rpcUserType,
        profileUserType: profile?.user_type,
        finalUserType,
      });
      setUserType(finalUserType);

      // Récupérer les system roles depuis user_roles table
      const { data: systemRolesData, error: systemRolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (systemRolesError) {
        console.warn("Erreur lors du chargement des system roles:", systemRolesError);
      }

      const roles = (systemRolesData?.map((r: { role: string }) => r.role) as SystemRole[]) || [];
      setSystemRoles(roles);
      console.log('[useUserRoles] System roles:', roles);
    } catch (err) {
      console.warn("Erreur lors du chargement des rôles:", err);
      // En cas d'erreur, utiliser le profile.user_type comme fallback
      const profileUserType = profile?.user_type as UserType | null;
      console.log('[useUserRoles] Error caught, using profile.user_type as fallback:', profileUserType);
      setUserType(profileUserType || null);
      setSystemRoles([]);
      setError(err instanceof Error ? err : new Error("Erreur inconnue"));
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.user_type, skipRpc]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const hasUserType = useCallback(
    (type: UserType): boolean => userType === type,
    [userType]
  );

  const hasSystemRole = useCallback(
    (role: SystemRole): boolean => systemRoles.includes(role),
    [systemRoles]
  );

  const computedValues = useMemo(
    () => ({
      // Admin: user_type = admin_ansut OU system role = admin
      isAdmin: userType === "admin_ansut" || systemRoles.includes("admin"),
      // Moderator: system role = moderator
      isModerator: systemRoles.includes("moderator"),
      // Trust Agent: user_type = trust_agent OU system role = trust_agent
      isTrustAgent: userType === "trust_agent" || systemRoles.includes("trust_agent"),
      // User: utilisateur standard sans rôle spécial
      isUser:
        (userType === "locataire" || userType === "proprietaire") &&
        !systemRoles.includes("admin") &&
        !systemRoles.includes("moderator") &&
        !systemRoles.includes("trust_agent") &&
        userType !== "admin_ansut" &&
        userType !== "trust_agent",
    }),
    [userType, systemRoles]
  );

  console.log('[useUserRoles] Computed values:', {
    userType,
    systemRoles,
    ...computedValues,
  });

  return {
    userType,
    systemRoles,
    loading,
    error,
    hasUserType,
    hasSystemRole,
    ...computedValues,
    refreshRoles: fetchRoles,
  };
}

// Pour compatibilité avec l'ancien code qui utilise `roles` comme tableau
export default useUserRoles;
