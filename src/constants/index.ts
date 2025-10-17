// ============= CENTRALIZED CONSTANTS =============
// Single source of truth for all application constants
// Single source of truth for all application constants

import type { ApplicationStatus, PropertyStatus, VerificationStatus } from '@/types';

// ============= 1. STATUSES & LABELS =============

export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  loué: 'Loué',
  loue: 'Loué',
  en_attente: 'En attente',
  retiré: 'Retiré',
  retire: 'Retiré',
  refuse: 'Refusé',
} as const;

export const PROPERTY_STATUS_COLORS: Record<string, string> = {
  disponible: 'bg-green-500',
  loué: 'bg-blue-500',
  loue: 'bg-blue-500',
  en_attente: 'bg-yellow-500',
  retiré: 'bg-gray-500',
  retire: 'bg-gray-500',
  refuse: 'bg-red-500',
} as const;

// Status semantic variants for StatusBadge
export const STATUS_VARIANTS = {
  disponible: 'success',
  loué: 'info',
  loue: 'info',
  en_attente: 'warning',
  retiré: 'neutral',
  retire: 'neutral',
  refuse: 'danger',
} as const;

// Status icons mapping
import { CheckCircle, Clock, Lock, XCircle, AlertTriangle, type LucideIcon } from 'lucide-react';

export const STATUS_ICONS: Record<string, LucideIcon> = {
  disponible: CheckCircle,
  loué: Lock,
  loue: Lock,
  en_attente: Clock,
  retiré: XCircle,
  retire: XCircle,
  refuse: AlertTriangle,
} as const;

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Rejetée',
  withdrawn: 'Retirée',
} as const;

export const APPLICATION_STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  withdrawn: 'outline',
} as const;

export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  verified: 'Vérifié',
  rejected: 'Rejeté',
  not_attempted: 'Non tenté',
} as const;

export const VERIFICATION_STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  verified: 'default',
  rejected: 'destructive',
  not_attempted: 'outline',
} as const;

export const CERTIFICATION_STATUS_LABELS: Record<string, string> = {
  not_requested: 'Non demandée',
  pending: 'En attente',
  certified: 'Certifié',
  rejected: 'Rejetée',
} as const;

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  completed: 'Complété',
  failed: 'Échoué',
  cancelled: 'Annulé',
} as const;

export const LEASE_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  terminated: 'Résilié',
  expired: 'Expiré',
} as const;

// ============= 2. PROPERTY TYPES =============

export const PROPERTY_TYPES = [
  'Appartement',
  'Villa',
  'Studio',
  'Maison',
] as const;

export type PropertyType = typeof PROPERTY_TYPES[number];

// ============= 3. PAYMENT TYPES =============

export const PAYMENT_METHODS = {
  MOBILE_MONEY: 'mobile_money',
  BANK_TRANSFER: 'bank_transfer',
  CASH: 'cash',
  CREDIT_CARD: 'credit_card',
} as const;

export const PAYMENT_TYPES = {
  RENT: 'rent',
  DEPOSIT: 'deposit',
  CHARGES: 'charges',
  COMMISSION: 'commission',
} as const;

export const MOBILE_MONEY_PROVIDERS = {
  ORANGE: 'orange_money',
  MTN: 'mtn_money',
  MOOV: 'moov_money',
  WAVE: 'wave',
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];
export type PaymentType = typeof PAYMENT_TYPES[keyof typeof PAYMENT_TYPES];
export type MobileMoneyProvider = typeof MOBILE_MONEY_PROVIDERS[keyof typeof MOBILE_MONEY_PROVIDERS];

// ============= 4. LIMITS & VALIDATIONS =============

export const FILE_LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_PANORAMA_SIZE: 8 * 1024 * 1024, // 8MB
  MAX_FLOOR_PLAN_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES_PER_PROPERTY: 10,
  MAX_PANORAMAS_PER_PROPERTY: 5,
  MAX_FLOOR_PLANS_PER_PROPERTY: 3,
  MAX_ATTACHMENTS_PER_MESSAGE: 5,
} as const;

export const VALIDATION_LIMITS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 72,
  MIN_TITLE_LENGTH: 5,
  MAX_TITLE_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 20,
  MAX_DESCRIPTION_LENGTH: 2000,
  MIN_COMMENT_LENGTH: 10,
  MAX_COMMENT_LENGTH: 1000,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_ADDRESS_LENGTH: 5,
  MAX_ADDRESS_LENGTH: 200,
  MIN_CITY_LENGTH: 2,
  MAX_CITY_LENGTH: 100,
  MAX_NEIGHBORHOOD_LENGTH: 100,
  MAX_PHONE_LENGTH: 20,
  MAX_BIO_LENGTH: 500,
} as const;

export const PROPERTY_LIMITS = {
  MIN_RENT: 10000,
  MAX_RENT: 10000000,
  MIN_SURFACE: 10,
  MAX_SURFACE: 1000,
  MIN_BEDROOMS: 0,
  MAX_BEDROOMS: 20,
  MIN_BATHROOMS: 0,
  MAX_BATHROOMS: 10,
  MIN_FLOOR: -5,
  MAX_FLOOR: 100,
} as const;

// ============= 5. ERROR MESSAGES =============

export const ERROR_MESSAGES = {
  // Auth errors
  AUTH_REQUIRED: 'Vous devez être connecté pour effectuer cette action',
  AUTH_INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  AUTH_EMAIL_EXISTS: 'Cette adresse email est déjà utilisée',
  AUTH_WEAK_PASSWORD: 'Le mot de passe est trop faible',
  AUTH_SESSION_EXPIRED: 'Votre session a expiré. Veuillez vous reconnecter.',
  
  // Form validation
  FIELD_REQUIRED: 'Ce champ est requis',
  EMAIL_INVALID: 'Adresse email invalide',
  PHONE_INVALID: 'Numéro de téléphone invalide',
  PASSWORD_TOO_SHORT: `Le mot de passe doit contenir au moins ${VALIDATION_LIMITS.MIN_PASSWORD_LENGTH} caractères`,
  TITLE_TOO_SHORT: `Le titre doit contenir au moins ${VALIDATION_LIMITS.MIN_TITLE_LENGTH} caractères`,
  TITLE_TOO_LONG: `Le titre ne peut pas dépasser ${VALIDATION_LIMITS.MAX_TITLE_LENGTH} caractères`,
  DESCRIPTION_TOO_SHORT: `La description doit contenir au moins ${VALIDATION_LIMITS.MIN_DESCRIPTION_LENGTH} caractères`,
  DESCRIPTION_TOO_LONG: `La description ne peut pas dépasser ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} caractères`,
  
  // File uploads
  FILE_TOO_LARGE: 'Le fichier est trop volumineux',
  FILE_TYPE_INVALID: 'Type de fichier non autorisé',
  MAX_FILES_EXCEEDED: 'Nombre maximum de fichiers dépassé',
  IMAGE_TOO_LARGE: `L'image ne doit pas dépasser ${FILE_LIMITS.MAX_IMAGE_SIZE / 1024 / 1024}MB`,
  VIDEO_TOO_LARGE: `La vidéo ne doit pas dépasser ${FILE_LIMITS.MAX_VIDEO_SIZE / 1024 / 1024}MB`,
  DOCUMENT_TOO_LARGE: `Le document ne doit pas dépasser ${FILE_LIMITS.MAX_DOCUMENT_SIZE / 1024 / 1024}MB`,
  
  // Network errors
  NETWORK_ERROR: 'Erreur de connexion. Veuillez réessayer.',
  SERVER_ERROR: 'Erreur serveur. Veuillez réessayer plus tard.',
  UNAUTHORIZED: "Vous n'avez pas les permissions nécessaires",
  FORBIDDEN: 'Accès interdit',
  NOT_FOUND: 'Ressource introuvable',
  
  // Business logic
  PROPERTY_NOT_FOUND: 'Propriété introuvable',
  APPLICATION_ALREADY_EXISTS: 'Vous avez déjà postulé pour cette propriété',
  APPLICATION_NOT_FOUND: 'Candidature introuvable',
  LEASE_NOT_FOUND: 'Bail introuvable',
  PAYMENT_FAILED: 'Le paiement a échoué',
  VERIFICATION_FAILED: 'La vérification a échoué',
  GEOCODING_FAILED: 'Impossible de localiser l\'adresse',
  UPLOAD_FAILED: 'Échec du téléchargement du fichier',
  
  // Media & Upload
  FILE_REQUIRED: 'Au moins une image est requise',
  INVALID_FILE_TYPE: 'Type de fichier non autorisé',
  DELETE_FAILED: 'Échec de la suppression',
  MEDIA_LOAD_FAILED: 'Impossible de charger les médias',
  
  // Property specific
  PROPERTY_LOAD_FAILED: 'Impossible de charger la propriété',
  PROPERTY_CREATE_FAILED: 'Échec de la création de la propriété',
  PROPERTY_UPDATE_FAILED: 'Échec de la mise à jour',
  PROPERTY_DELETE_FAILED: 'Échec de la suppression',
  
  // Permissions
  PERMISSION_DENIED: "Vous n'avez pas la permission d'effectuer cette action",
  OWNER_ONLY: 'Seul le propriétaire peut modifier ce bien',
  
  // Network
  CONNECTION_LOST: 'Connexion perdue. Veuillez vérifier votre connexion internet.',
  TIMEOUT: 'La requête a expiré. Veuillez réessayer.',
} as const;

// ============= 6. SUCCESS MESSAGES =============

export const SUCCESS_MESSAGES = {
  // Auth
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  SIGNUP_SUCCESS: 'Compte créé avec succès',
  PASSWORD_RESET_SENT: 'Email de réinitialisation envoyé',
  PASSWORD_UPDATED: 'Mot de passe mis à jour',
  
  // Profile
  PROFILE_UPDATED: 'Profil mis à jour avec succès',
  AVATAR_UPDATED: 'Photo de profil mise à jour',
  
  // Properties
  PROPERTY_CREATED: 'Propriété créée avec succès',
  PROPERTY_UPDATED: 'Propriété mise à jour avec succès',
  PROPERTY_DELETED: 'Propriété supprimée avec succès',
  PROPERTY_FAVORITED: 'Ajouté aux favoris',
  PROPERTY_UNFAVORITED: 'Retiré des favoris',
  
  // Applications
  APPLICATION_SUBMITTED: 'Candidature envoyée avec succès',
  APPLICATION_APPROVED: 'Candidature approuvée',
  APPLICATION_REJECTED: 'Candidature rejetée',
  APPLICATION_WITHDRAWN: 'Candidature retirée',
  
  // Payments
  PAYMENT_SUCCESS: 'Paiement effectué avec succès',
  PAYMENT_INITIATED: 'Paiement initié. Veuillez suivre les instructions.',
  
  // Reviews
  REVIEW_SUBMITTED: 'Avis publié avec succès',
  REVIEW_UPDATED: 'Avis mis à jour avec succès',
  REVIEW_DELETED: 'Avis supprimé avec succès',
  
  // Verification
  VERIFICATION_SUCCESS: 'Vérification réussie',
  ONECI_VERIFIED: 'Identité ONECI vérifiée',
  CNAM_VERIFIED: 'CNAM vérifié',
  FACE_VERIFIED: 'Visage vérifié',
  
  // Lease
  LEASE_CREATED: 'Bail créé avec succès',
  LEASE_SIGNED: 'Bail signé avec succès',
  LEASE_CERTIFIED: 'Bail certifié par ANSUT',
  
  // Messages
  MESSAGE_SENT: 'Message envoyé',
  
  // Documents
  DOCUMENT_UPLOADED: 'Document téléchargé avec succès',
  DOCUMENT_DELETED: 'Document supprimé',
  
  // Media
  MEDIA_UPLOADED: 'Médias téléchargés avec succès',
  MEDIA_DELETED: 'Médias supprimés avec succès',
  
  // Property
  PROPERTY_SAVED: 'Propriété enregistrée',
} as const;

// ============= 7. CITIES & LOCALIZATION =============

export const CITIES = [
  'Abidjan',
  'Yamoussoukro',
  'Bouaké',
  'Daloa',
  'San-Pedro',
  'Korhogo',
  'Man',
  'Gagnoa',
  'Divo',
  'Abengourou',
] as const;

export type City = typeof CITIES[number];

export const MAP_CONFIG = {
  DEFAULT_ZOOM: 13,
  MAX_ZOOM: 18,
  MIN_ZOOM: 5,
  DEFAULT_CENTER: { lat: 5.3600, lng: -4.0083 }, // Abidjan
  SEARCH_RADIUS_KM: 10,
  MAX_SEARCH_RADIUS_KM: 50,
} as const;

// ============= 8. NOTIFICATION TYPES =============

export const NOTIFICATION_TYPES = {
  APPLICATION_SUBMITTED: 'application_submitted',
  APPLICATION_APPROVED: 'application_approved',
  APPLICATION_REJECTED: 'application_rejected',
  NEW_MESSAGE: 'new_message',
  PROPERTY_VIEWED: 'property_viewed',
  PROPERTY_FAVORITED: 'property_favorited',
  VERIFICATION_COMPLETED: 'verification_completed',
  LEASE_SIGNED: 'lease_signed',
  PAYMENT_RECEIVED: 'payment_received',
  REVIEW_RECEIVED: 'review_received',
  CERTIFICATION_APPROVED: 'certification_approved',
  CERTIFICATION_REJECTED: 'certification_rejected',
} as const;

export const NOTIFICATION_CATEGORIES = {
  APPLICATIONS: 'applications',
  MESSAGES: 'messages',
  PROPERTIES: 'properties',
  PAYMENTS: 'payments',
  REVIEWS: 'reviews',
  VERIFICATION: 'verification',
  SYSTEM: 'system',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[keyof typeof NOTIFICATION_CATEGORIES];

// ============= 9. HELPER FUNCTIONS =============

/**
 * Check if a value is a valid property status
 */
export const isValidPropertyStatus = (status: string): status is PropertyStatus => {
  return ['disponible', 'loué', 'en_attente', 'retiré'].includes(status);
};

/**
 * Check if a value is a valid application status
 */
export const isValidApplicationStatus = (status: string): status is ApplicationStatus => {
  return ['pending', 'approved', 'rejected', 'withdrawn'].includes(status);
};

/**
 * Check if a value is a valid verification status
 */
export const isValidVerificationStatus = (status: string): status is VerificationStatus => {
  return ['pending', 'verified', 'rejected', 'not_attempted'].includes(status);
};

/**
 * Format price with FCFA currency
 */
export const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null) {
    return '0 FCFA';
  }
  return `${price.toLocaleString('fr-FR')} FCFA`;
};

/**
 * Format price per month
 */
export const formatMonthlyRent = (rent: number): string => {
  return `${formatPrice(rent)}/mois`;
};

/**
 * Get file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validate file size
 */
export const validateFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

/**
 * Validate file type
 */
export const validateImageType = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
};

export const validateVideoType = (file: File): boolean => {
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  return validTypes.includes(file.type);
};

export const validateDocumentType = (file: File): boolean => {
  const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  return validTypes.includes(file.type);
};

// ============= HELPER FUNCTIONS =============

/**
 * Get property status label
 */
export function getPropertyStatusLabel(status: string): string {
  return PROPERTY_STATUS_LABELS[status] || status;
}

/**
 * Get property status color class
 */
export function getPropertyStatusColor(status: string): string {
  return PROPERTY_STATUS_COLORS[status] || 'bg-gray-500';
}

/**
 * Get application status label
 */
export function getApplicationStatusLabel(status: ApplicationStatus): string {
  return APPLICATION_STATUS_LABELS[status] || status;
}

/**
 * Get application status variant
 */
export function getApplicationStatusVariant(
  status: ApplicationStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  return APPLICATION_STATUS_VARIANTS[status] || 'outline';
}

/**
 * Get verification status label
 */
export function getVerificationStatusLabel(status: VerificationStatus): string {
  return VERIFICATION_STATUS_LABELS[status] || status;
}

/**
 * Get verification status variant
 */
export function getVerificationStatusVariant(
  status: VerificationStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  return VERIFICATION_STATUS_VARIANTS[status] || 'outline';
}

// ============= 10. DESIGN TOKENS =============

export const DESIGN_TOKENS = {
  borderRadius: {
    card: '16px',
    button: '12px',
    input: '8px',
    badge: '9999px', // full rounded
  },
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
    card: '0 2px 8px rgba(0, 0, 0, 0.08)',
    cardHover: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
} as const;
