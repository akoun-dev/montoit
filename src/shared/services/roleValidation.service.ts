/**
 * Service de validation des rôles pour la sécurité des API
 *
 * Ce service fournit des fonctions utilitaires pour vérifier les autorisations
 * des utilisateurs au niveau de la couche API, en complément du RLS de Supabase.
 */

import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'tenant' | 'owner' | 'agency' | 'admin' | 'trust_agent' | 'moderator';

// Mapping des valeurs de la base de données vers l'enum UserRole
const USER_TYPE_MAPPING: Record<string, UserRole> = {
  'locataire': 'tenant',
  'proprietaire': 'owner',
  'agence': 'agency',
  'admin': 'admin',
  'admin_ansut': 'admin',
  'trust_agent': 'trust_agent',
  'moderator': 'moderator',
  'tenant': 'tenant',
  'owner': 'owner',
  'agent': 'agency',
};

export interface RolePermissions {
  canCreateProperty: boolean;
  canEditProperty: boolean;
  canDeleteProperty: boolean;
  canViewAllProperties: boolean;
  canManageUsers: boolean;
  canAccessAdminPanel: boolean;
  canVerifyUsers: boolean;
  canModerateContent: boolean;
  canManageContracts: boolean;
  canAccessAllContracts: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  tenant: {
    canCreateProperty: false,
    canEditProperty: false,
    canDeleteProperty: false,
    canViewAllProperties: true,
    canManageUsers: false,
    canAccessAdminPanel: false,
    canVerifyUsers: false,
    canModerateContent: false,
    canManageContracts: true,
    canAccessAllContracts: false,
  },
  owner: {
    canCreateProperty: true,
    canEditProperty: true,
    canDeleteProperty: true,
    canViewAllProperties: true,
    canManageUsers: false,
    canAccessAdminPanel: false,
    canVerifyUsers: false,
    canModerateContent: false,
    canManageContracts: true,
    canAccessAllContracts: false,
  },
  agency: {
    canCreateProperty: true,
    canEditProperty: true,
    canDeleteProperty: true,
    canViewAllProperties: true,
    canManageUsers: false,
    canAccessAdminPanel: false,
    canVerifyUsers: false,
    canModerateContent: false,
    canManageContracts: true,
    canAccessAllContracts: false,
  },
  admin: {
    canCreateProperty: true,
    canEditProperty: true,
    canDeleteProperty: true,
    canViewAllProperties: true,
    canManageUsers: true,
    canAccessAdminPanel: true,
    canVerifyUsers: true,
    canModerateContent: true,
    canManageContracts: true,
    canAccessAllContracts: true,
  },
  trust_agent: {
    canCreateProperty: false,
    canEditProperty: false,
    canDeleteProperty: false,
    canViewAllProperties: true,
    canManageUsers: false,
    canAccessAdminPanel: false,
    canVerifyUsers: true,
    canModerateContent: false,
    canManageContracts: false,
    canAccessAllContracts: true,
  },
  moderator: {
    canCreateProperty: false,
    canEditProperty: false,
    canDeleteProperty: false,
    canViewAllProperties: true,
    canManageUsers: false,
    canAccessAdminPanel: false,
    canVerifyUsers: false,
    canModerateContent: true,
    canManageContracts: false,
    canAccessAllContracts: true,
  },
};

/**
 * Vérifie le rôle de l'utilisateur actuel
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single();

  if (!profile?.user_type) return null;

  // Mapper le user_type de la base vers l'enum UserRole
  return USER_TYPE_MAPPING[profile.user_type] || null;
}

/**
 * Vérifie si l'utilisateur a une permission spécifique
 */
export async function hasPermission(permission: keyof RolePermissions): Promise<boolean> {
  const role = await getCurrentUserRole();
  if (!role) return false;

  return ROLE_PERMISSIONS[role][permission];
}

/**
 * Vérifie si l'utilisateur a un des rôles spécifiés
 */
export async function hasRole(allowedRoles: UserRole[]): Promise<boolean> {
  const role = await getCurrentUserRole();
  if (!role) return false;

  return allowedRoles.includes(role);
}

/**
 * Vérifie si l'utilisateur est le propriétaire de la ressource
 */
export async function isResourceOwner(
  resourceType: 'property' | 'contract' | 'application' | 'message',
  resourceId: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  let query;
  switch (resourceType) {
    case 'property':
      query = supabase.from('properties').select('owner_id').eq('id', resourceId).single();
      break;
    case 'contract':
      query = supabase
        .from('lease_contracts')
        .select('tenant_id, owner_id, property_id')
        .eq('id', resourceId)
        .single();
      break;
    case 'application':
      query = supabase
        .from('rental_applications')
        .select('tenant_id, property_id')
        .eq('id', resourceId)
        .single();
      break;
    case 'message':
      query = supabase
        .from('messages')
        .select('sender_id, receiver_id')
        .eq('id', resourceId)
        .single();
      break;
    default:
      return false;
  }

  const { data } = await query;
  if (!data) return false;

  // Pour les propriétés
  if (resourceType === 'property') {
    return data.owner_id === user.id;
  }

  // Pour les contrats
  if (resourceType === 'contract') {
    // Vérifier si l'utilisateur est le tenant
    if (data.tenant_id === user.id) return true;

    // Vérifier si l'utilisateur est le propriétaire direct du contrat
    if (data.owner_id === user.id) return true;

    // Vérifier si l'utilisateur est le propriétaire de la propriété
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('id', data.property_id)
      .single();

    return property?.owner_id === user.id;
  }

  // Pour les applications
  if (resourceType === 'application') {
    // Vérifier si l'utilisateur est le tenant
    if (data.tenant_id === user.id) return true;

    // Vérifier si l'utilisateur est le propriétaire de la propriété
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('id', data.property_id)
      .single();

    return property?.owner_id === user.id;
  }

  // Pour les messages
  if (resourceType === 'message') {
    return data.sender_id === user.id || data.receiver_id === user.id;
  }

  return false;
}

/**
 * Middleware de validation des permissions
 */
export function requirePermission(permission: keyof RolePermissions) {
  return async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: { userId?: string } = {}
  ) => {
    const hasPerm = await hasPermission(permission);
    if (!hasPerm) {
      throw new Error(`Permission requise: ${permission}`);
    }
  };
}

/**
 * Middleware de validation de rôle
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: { userId?: string } = {}
  ) => {
    const hasRequiredRole = await hasRole(allowedRoles);
    if (!hasRequiredRole) {
      throw new Error(`Rôle requis: ${allowedRoles.join(' ou ')}`);
    }
  };
}

/**
 * Vérifie si l'utilisateur peut gérer un contrat spécifique
 */
export async function canManageContract(contractId: string): Promise<boolean> {
  // Vérifier la permission de base
  const hasBasicPermission = await hasPermission('canManageContracts');
  if (!hasBasicPermission) return false;

  // Les admins peuvent gérer tous les contrats
  const hasAccessAll = await hasPermission('canAccessAllContracts');
  if (hasAccessAll) return true;

  // Vérifier si l'utilisateur est partie prenante du contrat
  return await isResourceOwner('contract', contractId);
}

/**
 * Vérifie si l'utilisateur peut créer un contrat pour une propriété
 */
export async function canCreateContractForProperty(propertyId: string): Promise<boolean> {
  // Vérifier la permission de base
  const hasBasicPermission = await hasPermission('canManageContracts');
  if (!hasBasicPermission) return false;

  // Les admins peuvent créer des contrats pour n'importe quelle propriété
  const hasAccessAll = await hasPermission('canAccessAllContracts');
  if (hasAccessAll) return true;

  // Vérifier si l'utilisateur est le propriétaire de la propriété
  return await isResourceOwner('property', propertyId);
}

/**
 * Middleware de validation de propriété
 */
export function requireOwnership(
  resourceType: 'property' | 'contract' | 'application' | 'message'
) {
  return async (resourceId: string) => {
    const isOwner = await isResourceOwner(resourceType, resourceId);
    if (!isOwner) {
      // Vérifier si admin
      const isAdmin = await hasRole(['admin']);
      if (!isAdmin) {
        throw new Error(`Accès non autorisé à la ressource ${resourceType}:${resourceId}`);
      }
    }
  };
}
