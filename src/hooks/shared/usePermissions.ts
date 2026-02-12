/**
 * usePermissions - Unified permissions hook combining user_type and system roles
 *
 * Business Types (from profiles.user_type):
 * - tenant: Can search, apply, pay rent
 * - owner: Can add properties, manage contracts
 * - agency: Can manage properties for multiple owners
 *
 * System Roles (from user_roles table):
 * - admin: Full platform access
 * - trust_agent: Property verification
 */

import { useMemo } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUserRoles, type SystemRole, type UserType } from '@/hooks/shared/useUserRoles';

export interface Permissions {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;

  // Business type checks
  isTenant: boolean;
  isOwner: boolean;
  isAgency: boolean;

  // System role checks (from user_roles table)
  isAdmin: boolean;
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
  systemRoles: SystemRole[];
}

export function usePermissions(): Permissions {
  const { user, profile, loading: authLoading } = useAuth();
  const { systemRoles, loading: rolesLoading, isAdmin, isTrustAgent, userType: roleUserType } = useUserRoles();

  return useMemo(() => {
    const isAuthenticated = !!user;
    const isLoading = authLoading || rolesLoading;

    // Get user type from profile
    const baseUserType = (profile?.user_type || profile?.active_role || roleUserType || null) as
      | UserType
      | null;
    const userType = isAdmin ? 'admin' : isTrustAgent ? 'trust_agent' : baseUserType;

    // Business type checks
    const isTenant = userType === 'tenant';
    const isOwner = userType === 'owner';
    const isAgency = userType === 'agency';

    // Property managers can add properties and manage contracts
    const isPropertyManager = isOwner || isAgency;

    return {
      // Authentication state
      isAuthenticated,
      isLoading,

      // Business type checks
      isTenant,
      isOwner,
      isAgency,

      // System role checks
      isAdmin,
      isTrustAgent,

      // Feature permissions
      canAddProperty: isPropertyManager || isAdmin,
      canManageContracts: isPropertyManager || isAdmin,
      canApplyForRental: isTenant || isAdmin,
      canCertifyUser: isTrustAgent || isAdmin,
      canCertifyProperty: isTrustAgent || isAdmin,
      canAccessAdmin: isAdmin,
      canManageUsers: isAdmin,
      canModerateContent: isAdmin,
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
      systemRoles,
    };
  }, [user, profile, roleUserType, authLoading, rolesLoading, systemRoles, isAdmin, isTrustAgent]);
}

export default usePermissions;
