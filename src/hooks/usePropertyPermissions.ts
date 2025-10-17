import { useAuth } from './useAuth';
import { ERROR_MESSAGES } from '@/constants';
import { useAgencyMandates } from './useAgencyMandates';

/**
 * Hook for managing property-related permissions
 * Centralizes user type and ownership verification logic
 * Includes agency mandate management
 */
export const usePropertyPermissions = () => {
  const { user, profile, roles } = useAuth();
  const { activeMandates, asAgency } = useAgencyMandates();

  /**
   * Check if user can manage properties (create, edit, delete)
   * Only 'proprietaire' and 'agence' can manage properties
   */
  const canManageProperties = (): boolean => {
    if (!user || !profile) return false;
    return profile.user_type === 'proprietaire' || profile.user_type === 'agence';
  };

  /**
   * Check if user can edit a specific property
   * User must be the owner OR an agency with an active mandate
   */
  const canEditProperty = (ownerId: string, propertyId?: string): boolean => {
    if (!user || !profile) return false;
    
    // Propriétaire du bien
    if (user.id === ownerId) return true;
    
    // Agence avec mandat actif
    if (profile.user_type === 'agence') {
      const hasMandate = asAgency.some(mandate => 
        mandate.status === 'active' &&
        (mandate.property_id === propertyId || mandate.property_id === null) &&
        mandate.owner_id === ownerId &&
        mandate.permissions.can_edit_properties === true
      );
      return hasMandate;
    }
    
    return false;
  };

  /**
   * Vérifier si une agence a une permission spécifique pour un bien
   */
  const hasAgencyPermission = (
    propertyId: string, 
    ownerId: string, 
    permission: keyof typeof activeMandates[0]['permissions']
  ): boolean => {
    if (!user || profile?.user_type !== 'agence') return false;
    
    const mandate = asAgency.find(m => 
      m.status === 'active' &&
      (m.property_id === propertyId || m.property_id === null) &&
      m.owner_id === ownerId
    );
    
    return mandate?.permissions[permission] === true;
  };

  /**
   * Require owner access - throws error if user doesn't have permission
   * Used to protect pages/routes that require owner access
   */
  const requireOwnerAccess = (): { hasAccess: boolean; error?: string } => {
    if (!user) {
      return { hasAccess: false, error: ERROR_MESSAGES.AUTH_REQUIRED };
    }
    
    if (!profile) {
      return { hasAccess: false, error: ERROR_MESSAGES.SERVER_ERROR };
    }
    
    if (!canManageProperties()) {
      return { 
        hasAccess: false, 
        error: ERROR_MESSAGES.UNAUTHORIZED 
      };
    }
    
    return { hasAccess: true };
  };

  return {
    canManageProperties: canManageProperties(),
    canEditProperty,
    hasAgencyPermission,
    requireOwnerAccess,
    activeMandates,
    asAgency,
    user,
    profile,
  };
};
