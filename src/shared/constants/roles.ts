/**
 * Application roles constants
 * Centralized role definitions to avoid magic strings
 *
 * There are TWO types of roles:
 * 1. Business Types (stored in profiles.user_type):
 *    - tenant/locataire: Can search, apply, pay rent
 *    - owner/proprietaire: Can add properties, manage contracts
 *    - agent/agence: Can manage properties for multiple owners
 *
 * 2. System Roles (stored in user_roles table):
 *    - admin: Full platform access
 *    - moderator: Content moderation
 *    - trust_agent: Property/user verification
 *    - user: Default role
 */

// Business types (from profiles.user_type)
export const ROLES = {
  // Business types (French - legacy)
  TENANT: 'locataire',
  OWNER: 'proprietaire',
  AGENCY: 'agence',

  // Business types (English - current)
  TENANT_EN: 'tenant',
  OWNER_EN: 'owner',
  AGENT: 'agent',

  // System roles (from user_roles table)
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  TRUST_AGENT: 'trust_agent',
  USER: 'user',
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

// Role groups for common access patterns
export const TENANT_ROLES = [ROLES.TENANT, ROLES.TENANT_EN] as const;
export const OWNER_ROLES = [ROLES.OWNER, ROLES.OWNER_EN] as const;
export const AGENCY_ROLES = [ROLES.AGENCY, ROLES.AGENT] as const;
export const PROPERTY_MANAGER_ROLES = [...OWNER_ROLES, ...AGENCY_ROLES] as const;

// System roles (from user_roles table - managed via has_role() function)
export const SYSTEM_ROLES = [ROLES.ADMIN, ROLES.MODERATOR, ROLES.TRUST_AGENT, ROLES.USER] as const;

// All authenticated users
export const ALL_AUTHENTICATED = [...TENANT_ROLES, ...OWNER_ROLES, ...AGENCY_ROLES] as const;
