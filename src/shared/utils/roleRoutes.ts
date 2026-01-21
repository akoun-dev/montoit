/**
 * Role-based routes configuration
 * Centralizes all role-specific routing logic
 */

export type UserRole =
  | 'locataire'
  | 'proprietaire'
  | 'agence'
  | 'tenant'
  | 'owner'
  | 'agent'
  | 'trust_agent';

/**
 * Dashboard routes by role
 * Structure : /{userType}/dashboard
 */
export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  locataire: '/locataire/dashboard',
  tenant: '/locataire/dashboard', // Alias for locataire
  proprietaire: '/proprietaire/dashboard',
  owner: '/proprietaire/dashboard', // Alias for proprietaire
  agence: '/agences/dashboard',
  agent: '/agences/dashboard', // Alias for agence
  trust_agent: '/trust-agent/dashboard',
};

/**
 * Other common routes by role
 */
export const ROLE_ROUTES: Record<string, Record<UserRole, string>> = {
  profile: {
    locataire: '/profil',
    tenant: '/profil',
    proprietaire: '/profil',
    owner: '/profil',
    agence: '/profil',
    agent: '/profil',
    trust_agent: '/profil',
  },
  addProperty: {
    locataire: '/proprietaire/ajouter-propriete',
    tenant: '/proprietaire/ajouter-propriete',
    proprietaire: '/proprietaire/ajouter-propriete',
    owner: '/proprietaire/ajouter-propriete',
    agence: '/proprietaire/ajouter-propriete',
    agent: '/proprietaire/ajouter-propriete',
    trust_agent: '/proprietaire/ajouter-propriete',
  },
  contracts: {
    locataire: '/mes-contrats',
    tenant: '/mes-contrats',
    proprietaire: '/proprietaire/contrats',
    owner: '/proprietaire/contrats',
    agence: '/proprietaire/contrats',
    agent: '/proprietaire/contrats',
    trust_agent: '/proprietaire/contrats',
  },
  applications: {
    locataire: '/mes-candidatures',
    tenant: '/mes-candidatures',
    proprietaire: '/proprietaire/candidatures',
    owner: '/proprietaire/candidatures',
    agence: '/proprietaire/candidatures',
    agent: '/proprietaire/candidatures',
    trust_agent: '/proprietaire/candidatures',
  },
  messages: {
    locataire: '/messages',
    tenant: '/messages',
    proprietaire: '/messages',
    owner: '/messages',
    agence: '/messages',
    agent: '/messages',
    trust_agent: '/messages',
  },
};

/**
 * Normalize role names to standard format
 * IMPORTANT: No fallback to 'locataire' - throw error or return undefined for unknown roles
 * This prevents misrouting users to wrong dashboards
 */
export function normalizeRole(role: string): UserRole {
  if (!role) {
    console.error('[roleRoutes] normalizeRole called with empty role');
    return 'locataire'; // Keep safe default for legacy compatibility
  }

  const normalized = role.toLowerCase().trim();
  const roleMapping: Record<string, UserRole> = {
    locataire: 'locataire',
    tenant: 'tenant',
    proprietaire: 'proprietaire',
    owner: 'owner',
    agence: 'agence',
    agency: 'agence', // Handle English variant
    agent: 'agent',
    'trust-agent': 'trust_agent',
    trust_agent: 'trust_agent',
  };

  const mappedRole = roleMapping[normalized];
  if (!mappedRole) {
    console.error('[roleRoutes] Unknown role:', role, 'normalized:', normalized);
    // Don't silently fallback to locataire - log the error
    return 'locataire'; // Still need a default for TypeScript
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
    return DASHBOARD_ROUTES.locataire; // Safe default but logged
  }

  const normalizedRole = normalizeRole(role);
  const route = DASHBOARD_ROUTES[normalizedRole];

  if (!route) {
    console.error('[roleRoutes] No route found for role:', role, 'normalized:', normalizedRole);
    return DASHBOARD_ROUTES.locataire; // Safe default but logged
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
  if (!role) return routeMap.locataire;
  const normalizedRole = normalizeRole(role);
  return routeMap[normalizedRole] || routeMap.locataire;
}

/**
 * Role aliases mapping
 */
export const ROLE_ALIASES: Record<string, UserRole> = {
  locataire: 'locataire',
  tenant: 'tenant',
  proprietaire: 'proprietaire',
  owner: 'owner',
  agence: 'agence',
  agent: 'agent',
  trust_agent: 'trust_agent',
  'trust-agent': 'trust_agent',
};
