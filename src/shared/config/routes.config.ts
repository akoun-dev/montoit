/**
 * Configuration centralisée des routes de l'application
 */

export const ROUTES = {
  HOME: '/',

  AUTH: {
    LOGIN: '/connexion',
    SIGNUP: '/inscription',
    FORGOT_PASSWORD: '/mot-de-passe-oublie',
    RESET_PASSWORD: '/reinitialiser-mot-de-passe',
    VERIFY_OTP: '/verifier-otp',
    CALLBACK: '/auth/callback',
  },

  MARKETPLACE: {
    SEARCH: '/recherche',
    PROPERTY_DETAIL: '/propriete/:id',
  },

  COMMON: {
    PROFILE: '/profil',
    PROFILE_SELECTION: '/selection-profil',
    DASHBOARD: '/dashboard',
    MESSAGES: '/messages',
    ABOUT: '/a-propos',
    PRIVACY: '/politique-confidentialite',
    TERMS: '/conditions-utilisation',
  },

  PROPERTIES: {
    ADD: '/proprietaire/ajouter-propriete',
    STATS: '/dashboard/statistiques-propriete/:id',
    FAVORITES: '/favoris',
    SAVED_SEARCHES: '/recherches-sauvegardees',
    RECOMMENDATIONS: '/recommandations',
    COMPARISON: '/comparaison',
  },

  TENANT: {
    DASHBOARD: '/dashboard/locataire',
    CALENDAR: '/dashboard/locataire/calendrier',
    MAINTENANCE: '/dashboard/locataire/maintenance',
    SCORE: '/dashboard/locataire/score',
  },

  OWNER: {
    DASHBOARD: '/dashboard/proprietaire',
    MAINTENANCE: '/dashboard/proprietaire/maintenance',
  },

  AGENCY: {
    DASHBOARD: '/dashboard/agence',
    REGISTRATION: '/inscription-agence',
    PROPERTIES: '/dashboard/agence/proprietes',
    TEAM: '/dashboard/agence/equipe',
    COMMISSIONS: '/dashboard/agence/commissions',
    MY_MANDATES: '/mes-mandats',
    MANDATE_DETAIL: '/mandat/:id',
  },

  CONTRACTS: {
    LIST: '/proprietaire/contrats',
    DETAIL: '/proprietaire/contrat/:id',
    DETAIL_ENHANCED: '/proprietaire/contrat/:id/detaille',
    CREATE: '/proprietaire/creer-contrat/:propertyId',
    SIGN: '/proprietaire/signer-bail/:id',
  },

  AGENCY_CONTRACTS: {
    LIST: '/agences/contrats',
    CREATE: '/agences/creer-contrat/:propertyId',
  },

  PAYMENTS: {
    MAKE: '/effectuer-paiement',
    HISTORY: '/mes-paiements',
  },

  VERIFICATION: {
    REQUEST: '/verification',
    ANSUT: '/certification-ansut',
    CERTIFICATES: '/mes-certificats',
    REQUEST_CEV: '/demande-cev',
    CEV_DETAIL: '/cev/:id',
    REQUEST_TRUST: '/demande-validation-confiance',
    SETTINGS: '/parametres-verification',
  },

  VISITS: {
    SCHEDULE: '/locataire/visiter/:id',
    MY_VISITS: '/locataire/mes-visites',
  },

  MAINTENANCE: {
    REQUEST: '/demande-maintenance',
  },

  DISPUTES: {
    LIST: '/mes-litiges',
    CREATE: '/creer-litige',
    DETAIL: '/litige/:id',
  },

  APPLICATION: {
    FORM: '/locataire/candidature/:propertyId',
    DETAIL: '/locataire/candidature/:id',
  },

  NOTIFICATIONS: {
    PREFERENCES: '/preferences-notifications',
  },

  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/utilisateurs',
    USER_ROLES: '/admin/roles-utilisateurs',
    API_KEYS: '/admin/api-keys',
    SERVICE_PROVIDERS: '/admin/fournisseurs-services',
    SERVICE_CONFIGURATION: '/admin/configuration-services',
    SERVICE_MONITORING: '/admin/surveillance-services',
    TEST_DATA_GENERATOR: '/admin/generateur-donnees-test',
    QUICK_DEMO: '/admin/demo-rapide',
    TRUST_AGENTS: '/admin/agents-confiance',
    CEV_MANAGEMENT: '/admin/gestion-cev',
  },

  TRUST_AGENT: {
    DASHBOARD: '/agent-confiance/dashboard',
    ANALYTICS: '/agent-confiance/analytics',
    MODERATION: '/agent-confiance/moderation',
    MEDIATION: '/agent-confiance/mediation',
  },
} as const;

export function getPropertyDetailRoute(propertyId: string): string {
  return ROUTES.MARKETPLACE.PROPERTY_DETAIL.replace(':id', propertyId);
}

export function getContractDetailRoute(contractId: string): string {
  return ROUTES.CONTRACTS.DETAIL.replace(':id', contractId);
}

export function getScheduleVisitRoute(propertyId: string): string {
  return ROUTES.VISITS.SCHEDULE.replace(':id', propertyId);
}

export function getCreateContractRoute(propertyId: string): string {
  return ROUTES.CONTRACTS.CREATE.replace(':propertyId', propertyId);
}

export function getApplicationFormRoute(propertyId: string): string {
  return ROUTES.APPLICATION.FORM.replace(':propertyId', propertyId);
}

export default ROUTES;
