import { useAuth } from './useAuth';

/**
 * Hook centralisé pour gérer toutes les permissions de l'application
 * Combine les vérifications de rôles et de user_type
 */
export const usePermissions = () => {
  const { user, profile, roles, hasRole } = useAuth();

  const permissions = {
    // Permissions admin
    canAccessAdminDashboard: hasRole('admin') || hasRole('super_admin'),
    canManageUsers: hasRole('super_admin'),
    canModerateProperties: hasRole('admin') || hasRole('super_admin'),
    canCertifyLeases: hasRole('admin') || hasRole('super_admin'),
    canResolveDisputes: hasRole('admin') || hasRole('super_admin'),
    canViewAuditLogs: hasRole('admin') || hasRole('super_admin'),
    canPromoteToSuperAdmin: hasRole('super_admin'),
    
    // Permissions tiers de confiance
    canAccessTiersDashboard: hasRole('tiers_de_confiance'),
    canValidateDossiers: hasRole('tiers_de_confiance'),
    
    // Permissions propriétaire/agence
    canManageProperties: profile?.user_type === 'proprietaire' || profile?.user_type === 'agence',
    canCreateProperty: profile?.user_type === 'proprietaire' || profile?.user_type === 'agence',
    canViewApplications: profile?.user_type === 'proprietaire' || profile?.user_type === 'agence',
    canCreateLease: profile?.user_type === 'proprietaire' || profile?.user_type === 'agence',
    
    // Permissions locataire
    canApplyToProperties: profile?.user_type === 'locataire',
    canSaveFavorites: profile?.user_type === 'locataire',
    canViewRecommendations: profile?.user_type === 'locataire',
    
    // Permissions communes
    isAuthenticated: !!user,
    canSendMessages: !!user,
    canLeaveReviews: !!user,
    canUpdateProfile: !!user,
  };

  /**
   * Vérifier si l'utilisateur peut modifier une propriété spécifique
   */
  const canEditProperty = (ownerId: string): boolean => {
    if (!user || !profile) return false;
    return permissions.canManageProperties && user.id === ownerId;
  };

  /**
   * Vérifier si l'utilisateur peut accéder à une ressource
   */
  const canAccessResource = (resourceOwnerId: string): boolean => {
    if (!user) return false;
    return user.id === resourceOwnerId || permissions.canAccessAdminDashboard;
  };

  return {
    ...permissions,
    canEditProperty,
    canAccessResource,
    user,
    profile,
    roles,
  };
};
