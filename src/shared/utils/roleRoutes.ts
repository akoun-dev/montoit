/**
 * Role-based routes configuration
 * Centralizes all role-specific routing logic
 */

export type UserRole =
  | 'tenant'
  | 'owner'
  | 'agency'
  | 'trust_agent'
  | 'admin';

/**
 * Dashboard routes by role
 * Structure : /{userType}/dashboard
 */
export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  tenant: '/locataire/dashboard',
  owner: '/proprietaire/dashboard',
  agency: '/agences/dashboard',
  trust_agent: '/trust-agent/dashboard',
  admin: '/admin/tableau-de-bord',
};

/**
 * Other common routes by role
 */
export const ROLE_ROUTES: Record<string, Record<UserRole, string>> = {
  profile: {
    tenant: '/profil',
    owner: '/profil',
    agency: '/profil',
    trust_agent: '/profil',
    admin: '/profil',
  },
  addProperty: {
    tenant: '/proprietaire/ajouter-propriete',
    owner: '/proprietaire/ajouter-propriete',
    agency: '/proprietaire/ajouter-propriete',
    trust_agent: '/proprietaire/ajouter-propriete',
    admin: '/proprietaire/ajouter-propriete',
  },
  contracts: {
    tenant: '/mes-contrats',
    owner: '/proprietaire/contrats',
    agency: '/proprietaire/contrats',
    trust_agent: '/proprietaire/contrats',
    admin: '/proprietaire/contrats',
  },
  applications: {
    tenant: '/mes-candidatures',
    owner: '/proprietaire/candidatures',
    agency: '/proprietaire/candidatures',
    trust_agent: '/proprietaire/candidatures',
    admin: '/proprietaire/candidatures',
  },
  messages: {
    tenant: '/messages',
    owner: '/messages',
    agency: '/messages',
    trust_agent: '/messages',
    admin: '/messages',
  },
};

/**
 * Normalize role names to standard format
 * IMPORTANT: No fallback to 'tenant' - throw error or return undefined for unknown roles
 * This prevents misrouting users to wrong dashboards
 */
export function normalizeRole(role: string): UserRole {
  if (!role) {
    console.error('[roleRoutes] normalizeRole called with empty role');
    return 'tenant'; // Keep safe default for legacy compatibility
  }

  const normalized = role.toLowerCase().trim();
  const roleMapping: Record<string, UserRole> = {
    tenant: 'tenant',
    owner: 'owner',
    agency: 'agency', // Handle English variant
    'trust-agent': 'trust_agent',
    trust_agent: 'trust_agent',
    admin: 'admin',
  };

  const mappedRole = roleMapping[normalized];
  if (!mappedRole) {
    console.error('[roleRoutes] Unknown role:', role, 'normalized:', normalized);
    // Don't silently fallback to locataire - log the error
    return 'tenant'; // Still need a default for TypeScript
  }

  return mappedRole;
}

/**
 * Get dashboard route for a role
 * IMPORTANT: Returns the correct route based on user type, no silent fallbacks
 */
export function getDashboardRoute(role: string | undefined): string {
  if (!role) {
    console.error('[roleRoutes] getDashboardRoute called with undefined role');
    return DASHBOARD_ROUTES.tenant; // Safe default but logged
  }

  const normalizedRole = normalizeRole(role);
  const route = DASHBOARD_ROUTES[normalizedRole];

  if (!route) {
    console.error('[roleRoutes] No route found for role:', role, 'normalized:', normalizedRole);
    return DASHBOARD_ROUTES.tenant; // Safe default but logged
  }

  console.log('[roleRoutes] getDashboardRoute:', { role, normalizedRole, route });
  return route;
}

/**
 * Get route for a specific route type and role
 */
export function getRoleRoute(
  routeType: keyof typeof ROLE_ROUTES,
  role: string | undefined
): string {
  const routeMap = ROLE_ROUTES[routeType]!;
  if (!role) return routeMap.tenant;
  const normalizedRole = normalizeRole(role);
  return routeMap[normalizedRole] || routeMap.tenant;
}

/**
 * Role aliases mapping
 */
export const ROLE_ALIASES: Record<string, UserRole> = {
  tenant: 'tenant',
  owner: 'owner',
  trust_agent: 'trust_agent',
  'trust-agent': 'trust_agent',
  admin: 'admin',
};
