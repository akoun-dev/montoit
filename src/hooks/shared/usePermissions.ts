/**
 * usePermissions - Unified permissions hook combining user_type and system roles
 *
 * Business Types (from profiles.user_type):
 * - tenant: Can search, apply, pay rent
 * - owner: Can add properties, manage contracts
 * - agent: Can manage properties for multiple owners
 *
 * System Roles (from user_roles table):
 * - admin: Full platform access
 * - moderator: Content moderation
 * - trust_agent: Property verification
 * - user: Default role
 */

import { useMemo } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUserRoles, AppRole } from '@/hooks/shared/useUserRoles';

export interface Permissions {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;

  // Business type checks
  isTenant: boolean;
  isOwner: boolean;
  isAgent: boolean;

  // System role checks (from user_roles table)
  isAdmin: boolean;
  isModerator: boolean;
  isTrustAgent: boolean;

  // Feature permissions
  canAddProperty: boolean;
  canManageContracts: boolean;
  canApplyForRental: boolean;
  canCertifyUser: boolean;
  canCertifyProperty: boolean;
  canAccessAdmin: boolean;
  canManageUsers: boolean;
  canModerateContent: boolean;
  canViewAnalytics: boolean;
  canManageApiKeys: boolean;
  canAccessDashboard: boolean;
  canSendMessages: boolean;
  canMakePayments: boolean;
  canScheduleVisits: boolean;
  canViewOwnContracts: boolean;
  canCreateMaintenanceRequest: boolean;

  // User info
  userType: string | null;
  systemRoles: AppRole[];
}

export function usePermissions(): Permissions {
  const { user, profile, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading, isAdmin, isModerator, isTrustAgent } = useUserRoles();

  return useMemo(() => {
    const isAuthenticated = !!user;
    const isLoading = authLoading || rolesLoading;

    // Get user type from profile
    const userType = profile?.user_type || profile?.active_role || null;

    // Business type checks
    const isTenant = userType === 'tenant' || userType === 'locataire';
    const isOwner = userType === 'owner' || userType === 'proprietaire';
    const isAgent = userType === 'agent' || userType === 'agence';

    // Property managers can add properties and manage contracts
    const isPropertyManager = isOwner || isAgent;

    return {
      // Authentication state
      isAuthenticated,
      isLoading,

      // Business type checks
      isTenant,
      isOwner,
      isAgent,

      // System role checks
      isAdmin,
      isModerator,
      isTrustAgent,

      // Feature permissions
      canAddProperty: isPropertyManager || isAdmin,
      canManageContracts: isPropertyManager || isAdmin,
      canApplyForRental: isTenant || isAdmin,
      canCertifyUser: isTrustAgent || isAdmin,
      canCertifyProperty: isTrustAgent || isAdmin,
      canAccessAdmin: isAdmin,
      canManageUsers: isAdmin,
      canModerateContent: isModerator || isAdmin,
      canViewAnalytics: isPropertyManager || isAdmin,
      canManageApiKeys: isAdmin,
      canAccessDashboard: isAuthenticated,
      canSendMessages: isAuthenticated,
      canMakePayments: isTenant || isAdmin,
      canScheduleVisits: isTenant || isAdmin,
      canViewOwnContracts: isAuthenticated,
      canCreateMaintenanceRequest: isTenant || isAdmin,

      // User info
      userType,
      systemRoles: roles,
    };
  }, [user, profile, authLoading, rolesLoading, roles, isAdmin, isModerator, isTrustAgent]);
}

export default usePermissions;
