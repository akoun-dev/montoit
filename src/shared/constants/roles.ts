/**
 * Application roles constants
 * Centralized role definitions to avoid magic strings
 *
 * There are TWO types of roles:
 * 1. Business Types (stored in profiles.user_type):
 *    - tenant: Can search, apply, pay rent
 *    - owner: Can add properties, manage contracts
 *    - agency: Can manage properties for multiple owners
 *
 * 2. System Roles (stored in user_roles table):
 *    - admin: Full platform access
 *    - trust_agent: Property/user verification
 */

// Business types (from profiles.user_type)
export const ROLES = {
  // Business types
  TENANT: 'tenant',
  OWNER: 'owner',
  AGENCY: 'agency',

  // System roles (from user_roles table)
  ADMIN: 'admin',
  TRUST_AGENT: 'trust_agent',
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

// Role groups for common access patterns
export const TENANT_ROLES = [ROLES.TENANT] as const;
export const OWNER_ROLES = [ROLES.OWNER] as const;
export const AGENCY_ROLES = [ROLES.AGENCY] as const;
export const PROPERTY_MANAGER_ROLES = [...OWNER_ROLES, ...AGENCY_ROLES] as const;

// System roles (from user_roles table - managed via has_role() function)
export const SYSTEM_ROLES = [ROLES.ADMIN, ROLES.TRUST_AGENT] as const;

// All authenticated users
export const ALL_AUTHENTICATED = [...TENANT_ROLES, ...OWNER_ROLES, ...AGENCY_ROLES] as const;
