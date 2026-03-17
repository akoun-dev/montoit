/**
 * Application-wide constants
 * Keep this file organized by category
 */

// API & Environment
export const API_URL = import.meta.env['SUPABASE_URL'];
export const ANON_KEY = import.meta.env['SUPABASE_ANON_KEY'];

// Routes
export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/connexion',
    SIGNUP: '/inscription',
  },
  PROPERTIES: {
    SEARCH: '/recherche',
    DETAIL: '/propriete/:id',
    ADD: '/proprietaire/ajouter-propriete',
  },
  DASHBOARD: {
    OWNER: '/proprietaire/dashboard',
    TENANT: '/locataire/dashboard',
  },
  PROFILE: '/profil',
  MESSAGES: '/messages',
  CONTRACTS: {
    LIST: '/proprietaire/contrats',
    DETAIL: '/proprietaire/contrat/:id',
    CREATE: '/proprietaire/creer-contrat/:propertyId',
    SIGN: '/proprietaire/signer-bail/:id',
  },
  PAYMENTS: {
    MAKE: '/effectuer-paiement',
    HISTORY: '/mes-paiements',
  },
  VERIFICATION: {
    REQUEST: '/verification',
    ANSUT: '/certification-ansut',
    CERTIFICATES: '/mes-certificats',
  },
  VISITS: {
    SCHEDULE: '/visiter/:id',
    MY_VISITS: '/mes-visites',
  },
  FAVORITES: '/favoris',
  SEARCHES: '/recherches-sauvegardees',
  ADMIN: {
    API_KEYS: '/admin/api-keys',
  },
} as const;

// Property Categories
export const PROPERTY_CATEGORIES = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
} as const;

// Residential Property Types (Main focus of Mon Toit platform)
export const RESIDENTIAL_PROPERTY_TYPES = [
  { value: 'apartment', label: 'Appartement', category: 'residential', icon: '🏢' },
  { value: 'house', label: 'Maison individuelle', category: 'residential', icon: '🏠' },
  { value: 'studio', label: 'Studio', category: 'residential', icon: '🚪' },
  { value: 'villa', label: 'Villa', category: 'residential', icon: '🏡' },
  { value: 'duplex', label: 'Duplex', category: 'residential', icon: '🏘️' },
  { value: 'room', label: 'Chambre individuelle', category: 'residential', icon: '🛏️' },
] as const;

// Commercial Property Types (For future "Mon Commerce" or "Mon Foncier" module)
export const COMMERCIAL_PROPERTY_TYPES = [
  { value: 'office', label: 'Bureau', category: 'commercial', icon: '💼' },
  { value: 'retail', label: 'Local commercial', category: 'commercial', icon: '🏪' },
  { value: 'warehouse', label: 'Entrepôt', category: 'commercial', icon: '🏗️' },
  { value: 'land', label: 'Terrain', category: 'commercial', icon: '🌾' },
] as const;

// All Property Types (combined for admin/advanced use)
export const PROPERTY_TYPES = [
  ...RESIDENTIAL_PROPERTY_TYPES,
  ...COMMERCIAL_PROPERTY_TYPES,
] as const;

// Cities
export const CITIES = [
  'Abidjan',
  'Yamoussoukro',
  'Bouaké',
  'Daloa',
  'San-Pédro',
  'Korhogo',
  'Man',
  'Gagnoa',
  'Divo',
  'Abengourou',
] as const;

// Abidjan Communes
export const ABIDJAN_COMMUNES = [
  'Abobo',
  'Adjamé',
  'Attécoubé',
  'Cocody',
  'Koumassi',
  'Marcory',
  'Plateau',
  'Port-Bouët',
  'Treichville',
  'Yopougon',
  'Bingerville',
  'Songon',
  'Anyama',
] as const;

// User Types
export const USER_TYPES = [
  { value: 'tenant', label: 'Locataire' },
  { value: 'owner', label: 'Propriétaire' },
  { value: 'agency', label: 'Agence' },
] as const;

// Payment Methods
export const PAYMENT_METHODS = [
  { value: 'orange_money', label: 'Orange Money', prefixes: ['07', '227'] },
  { value: 'mtn_money', label: 'MTN Money', prefixes: ['05', '054', '055', '056'] },
  { value: 'moov_money', label: 'Moov Money', prefixes: ['01'] },
  { value: 'wave', label: 'Wave', prefixes: [] },
] as const;

// Lease Durations (in months)
export const LEASE_DURATIONS = [6, 12, 24, 36] as const;

// File Upload Limits
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES: 10,
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ACCEPTED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  PAGE_SIZE_OPTIONS: [12, 24, 48, 96],
} as const;

// Verification Status
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

// Score Thresholds
export const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 0,
} as const;

// Notification Duration (ms)
export const NOTIFICATION_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
  DATABASE: 'YYYY-MM-DD HH:mm:ss',
} as const;

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_CI: /^[0-9]{10}$/,
  CNI: /^[0-9]{12}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Ce champ est obligatoire',
  INVALID_EMAIL: 'Adresse email invalide',
  INVALID_PHONE: 'Numéro de téléphone invalide',
  INVALID_CNI: 'Numéro CNI invalide (12 chiffres)',
  PASSWORD_TOO_SHORT: 'Le mot de passe doit contenir au moins 8 caractères',
  PASSWORD_MISMATCH: 'Les mots de passe ne correspondent pas',
  FILE_TOO_LARGE: 'Le fichier est trop volumineux (max 5MB)',
  INVALID_FILE_TYPE: 'Type de fichier non autorisé',
  NETWORK_ERROR: 'Erreur de connexion. Veuillez réessayer.',
  UNKNOWN_ERROR: 'Une erreur est survenue. Veuillez réessayer.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Connexion réussie',
  SIGNUP_SUCCESS: 'Inscription réussie',
  PROFILE_UPDATED: 'Profil mis à jour avec succès',
  PROPERTY_CREATED: 'Propriété créée avec succès',
  PROPERTY_UPDATED: 'Propriété mise à jour avec succès',
  MESSAGE_SENT: 'Message envoyé',
  PAYMENT_SUCCESS: 'Paiement effectué avec succès',
  VERIFICATION_SUBMITTED: 'Demande de vérification envoyée',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth-token',
  USER_PREFERENCES: 'user-preferences',
  SEARCH_HISTORY: 'search-history',
  THEME: 'theme',
  PROPERTY_DRAFT: 'property-form-draft',
} as const;

// API Rate Limits
export const RATE_LIMITS = {
  SEARCH_DEBOUNCE: 300, // ms
  API_RETRY_ATTEMPTS: 3,
  API_RETRY_DELAY: 1000, // ms
} as const;

// Geolocation Settings
export const GEOLOCATION_SETTINGS = {
  DEFAULT_RADIUS: 5, // km
  RADIUS_OPTIONS: [5, 10, 20, 50], // km
  TIMEOUT: 10000, // ms
  MAX_AGE: 300000, // 5 minutes
} as const;
