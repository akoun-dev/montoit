/**
 * Interfaces TypeScript strictes pour MonToit
 * Remplace les types 'any' incorrects par des interfaces typées
 */

// Database type removed - not used in this file

/**
 * Adresse
 */
export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  neighborhood?: string;
}

/**
 * Contact d'urgence
 */
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

/**
 * Métadonnées de candidature
 */
export interface ApplicationMetadata {
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  submittedFrom: 'web' | 'mobile' | 'admin';
  priority: 'normale' | 'elevee' | 'urgente';
  notes?: string;
  adminNotes?: string;
}

// ============================================================================
// TYPES UTILISATEUR ET PROFIL
// ============================================================================

/**
 * Type pour les données complètes d'application récupérées de la base
 */
export interface CompleteApplicationData {
  id: string;
  property_id: string;
  applicant_id: string;
  status: string;
  message?: string;
  created_at: string;
  updated_at: string;
  property?: {
    id: string;
    title: string;
    address: string;
    [key: string]: any;
  };
  applicant?: {
    id: string;
    full_name: string;
    email: string;
    [key: string]: any;
  };
  documents?: {
    id: string;
    document_type: string;
    file_url: string;
    [key: string]: any;
  }[];
  [key: string]: any;
}

/**
 * Interface complète pour les données utilisateur
 */
export interface UserData {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  profile?: ProfileData;
  preferences: UserPreferences;
  activityHistory: UserActivity[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
}

/**
 * Données de profil utilisateur
 */
export interface ProfileData {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  nationality: string;
  address: Address;
  emergencyContact: EmergencyContact;
  profilePicture?: string;
  bio?: string;
  occupation?: string;
  employer?: string;
  monthlyIncome?: number;
  preferences: UserPreferences;
  metadata: ProfileMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Préférences utilisateur
 */
export interface UserPreferences {
  language: 'fr' | 'en';
  currency: 'FCFA' | 'EUR';
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  searchDefaults: SearchDefaults;
}

/**
 * Préférences de notifications
 */
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
    timezone: string;
  };
  categories: {
    applications: boolean;
    payments: boolean;
    messages: boolean;
    maintenance: boolean;
    marketing: boolean;
  };
}

/**
 * Paramètres de confidentialité
 */
export interface PrivacySettings {
  showProfile: boolean;
  showActivity: boolean;
  allowDirectMessages: boolean;
  dataSharing: {
    analytics: boolean;
    marketing: boolean;
    improvements: boolean;
  };
}

/**
 * Recherche par défaut
 */
export interface SearchDefaults {
  city?: string;
  propertyType?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  radius?: number; // km
}

/**
 * Historique d'activité utilisateur
 */
export interface UserActivity {
  id: string;
  userId: string;
  action: UserActionType;
  targetId?: string;
  targetType: ActivityTargetType;
  metadata: ActivityMetadata;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Types d'actions utilisateur
 */
export type UserActionType =
  | 'view_property'
  | 'favorite_property'
  | 'search_properties'
  | 'create_application'
  | 'submit_document'
  | 'send_message'
  | 'schedule_visit'
  | 'sign_contract'
  | 'make_payment'
  | 'update_profile'
  | 'login'
  | 'logout';

/**
 * Types de cibles d'activité
 */
export type ActivityTargetType =
  | 'property'
  | 'application'
  | 'message'
  | 'visit'
  | 'contract'
  | 'payment'
  | 'profile'
  | 'system';

/**
 * Métadonnées d'activité
 */
export interface ActivityMetadata {
  propertyId?: string;
  applicationId?: string;
  messageId?: string;
  visitId?: string;
  contractId?: string;
  paymentId?: string;
  searchFilters?: PropertyFilters;
  documentType?: string;
  visitDate?: Date;
  amount?: number;
  propertyType?: PropertyType;
  city?: string;
  [key: string]: unknown;
}

/**
 * Métadonnées de profil
 */
export interface ProfileMetadata {
  lastActivityAt?: Date;
  applicationCount?: number;
  propertyCount?: number;
  totalSpent?: number;
  score?: number;
  tags?: string[];
  notes?: string;
}

/**
 * Types d'utilisateur
 */
export type UserRole = 'tenant' | 'owner' | 'agency' | 'admin' | 'trust_agent' | 'super_admin';

/**
 * Status de vérification
 */
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';

// ============================================================================
// TYPES PROPRIÉTÉ ET RECHERCHE
// ============================================================================

/**
 * Types de propriétés
 */
export type PropertyType =
  | 'studio'
  | 'appartement_1p'
  | 'appartement_2p'
  | 'appartement_3p'
  | 'appartement_4p+'
  | 'maison_villa'
  | 'duplex'
  | 'loft'
  | 'chambre_sdb';

/**
 * Statuts de propriété
 */
export type PropertyStatus = 'available' | 'rented' | 'maintenance' | 'unavailable' | 'draft';

/**
 * Filtres de recherche de propriétés
 */
export interface PropertyFilters {
  propertyType?: PropertyType;
  city?: string;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  minSurface?: number;
  maxSurface?: number;
  furnished?: boolean;
  parking?: boolean;
  ac?: boolean;
  petFriendly?: boolean;
  minFloor?: number;
  maxFloor?: number;
  searchQuery?: string;
  coordinates?: GeoCoordinates;
  radius?: number; // km
  features?: PropertyFeature[];
}

/**
 * Caractéristiques de propriété
 */
export type PropertyFeature =
  | 'parking'
  | 'air_conditioning'
  | 'furnished'
  | 'balcony'
  | 'terrace'
  | 'garden'
  | 'elevator'
  | 'security'
  | 'pool'
  | 'gym'
  | 'laundry'
  | 'dishwasher'
  | 'internet';

/**
 * Coordonnées géographiques
 */
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

// ============================================================================
// TYPES CHAT ET MESSAGERIE
// ============================================================================

/**
 * Interface pour les messages de chatbot
 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: ChatMessageMetadata;
  timestamp: Date;
  isRead: boolean;
  readAt?: Date;
  attachments?: ChatAttachment[];
  reactions?: ChatReaction[];
}

/**
 * Métadonnées de message de chat
 */
export interface ChatMessageMetadata {
  intent?: string;
  confidence?: number;
  suggestions?: string[];
  context?: Record<string, unknown>;
  processingTimeMs?: number;
  aiModel?: string;
  fallbackUsed?: boolean;
}

/**
 * Pièces jointes de chat
 */
export interface ChatAttachment {
  id: string;
  type: 'image' | 'document' | 'location' | 'property';
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

/**
 * Réactions à un message
 */
export interface ChatReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

/**
 * Interface pour les conversations de chatbot
 */
export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  status: ChatConversationStatus;
  type: ChatConversationType;
  metadata: ChatConversationMetadata;
  lastMessage?: ChatMessage;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

/**
 * Statuts de conversation
 */
export type ChatConversationStatus = 'active' | 'archived' | 'closed';

/**
 * Types de conversation
 */
export type ChatConversationType =
  | 'support'
  | 'ai_assistant'
  | 'property_inquiry'
  | 'application_help';

/**
 * Métadonnées de conversation
 */
export interface ChatConversationMetadata {
  subject?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  tags?: string[];
  assignedTo?: string;
  resolvedBy?: string;
  resolutionTime?: number;
  satisfactionScore?: number;
  context?: Record<string, unknown>;
}

// ============================================================================
// TYPES ACTIVITÉ ET RECOMMANDATIONS
// ============================================================================

/**
 * Interface pour les données d'activité utilisateur
 */
export interface ActivityData {
  id: string;
  userId: string;
  type: ActivityType;
  timestamp: Date;
  duration?: number;
  metadata: ActivityMetadata;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Types d'activité
 */
export type ActivityType =
  | 'property_view'
  | 'property_search'
  | 'property_favorite'
  | 'property_apply'
  | 'visit_request'
  | 'message_sent'
  | 'document_upload'
  | 'payment_made'
  | 'contract_signed';

/**
 * Interface pour les recommandations de propriétés
 */
export interface PropertyRecommendation {
  propertyId: string;
  userId: string;
  score: number;
  reason: RecommendationReason;
  algorithm: RecommendationAlgorithm;
  confidence: number;
  createdAt: Date;
  clicked?: boolean;
  clickedAt?: Date;
  applied?: boolean;
  appliedAt?: Date;
  metadata: RecommendationMetadata;
}

/**
 * Raisons de recommandation
 */
export interface RecommendationReason {
  primary: string;
  secondary: string[];
  factors: RecommendationFactor[];
}

/**
 * Facteurs de recommandation
 */
export interface RecommendationFactor {
  name: string;
  weight: number;
  description: string;
}

/**
 * Algorithmes de recommandation
 */
export type RecommendationAlgorithm =
  | 'collaborative_filtering'
  | 'content_based'
  | 'hybrid'
  | 'ai_powered'
  | 'trending'
  | 'similar_users';

/**
 * Métadonnées de recommandation
 */
export interface RecommendationMetadata {
  userPreferences: UserPreferences;
  activityContext: ActivityData[];
  similarUsers?: string[];
  marketTrends?: MarketTrend[];
  seasonalFactors?: SeasonalFactor[];
}

/**
 * Tendances du marché
 */
export interface MarketTrend {
  city: string;
  propertyType: PropertyType;
  trend: 'rising' | 'falling' | 'stable';
  percentageChange: number;
  averagePrice: number;
  demandScore: number;
  period: 'month' | 'quarter' | 'year';
}

/**
 * Facteurs saisonniers
 */
export interface SeasonalFactor {
  period: string;
  impact: number;
  description: string;
}

// ============================================================================
// TYPES NOTIFICATION ET ERREUR
// ============================================================================

/**
 * Interface pour les erreurs d'API
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  requestId?: string;
  stack?: string;
}

/**
 * Interface pour les réponses d'API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
  };
}

/**
 * Interface pour les notifications système
 */
export interface SystemNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  actions?: NotificationAction[];
  expiresAt?: Date;
  createdAt: Date;
  readBy?: string[];
}

/**
 * Types de notifications
 */
export type NotificationType =
  | 'system_maintenance'
  | 'security_alert'
  | 'feature_update'
  | 'billing_notice'
  | 'policy_change';

/**
 * Actions de notification
 */
export interface NotificationAction {
  label: string;
  url?: string;
  action?: string;
  primary?: boolean;
}

// ============================================================================
// TYPES MÉTIER SPÉCIFIQUES
// ============================================================================

/**
 * Interface pour les données de candidature (UserData pour applications)
 */
export interface ApplicationData {
  id: string;
  applicantId: string;
  propertyId: string;
  status: ApplicationStatus;
  currentStep: ApplicationStep;
  formData: ApplicationFormData;
  documents: Document[];
  score?: ApplicationScore;
  notes?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  reviewedAt?: Date;
  metadata: ApplicationMetadata;
}

/**
 * Types de statut de candidature
 */
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

/**
 * Types d'étapes de candidature
 */
export type ApplicationStep =
  | 'personal_info'
  | 'financial_info'
  | 'guarantees'
  | 'documents'
  | 'review';

/**
 * Interface pour les données de formulaire de candidature
 */
export interface ApplicationFormData {
  personalInfo: PersonalInfo;
  financialInfo: FinancialInfo;
  guarantees: Guarantees;
  documents: File[];
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

/**
 * Informations personnelles du candidat
 */
export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  nationality: string;
  address: Address;
  emergencyContact: EmergencyContact;
}

/**
 * Situation financière du candidat
 */
export interface FinancialInfo {
  monthlyIncome: number;
  employmentType: EmploymentType;
  employer?: string;
  employmentStartDate?: Date;
  monthlyExpenses: number;
  existingCredits: CreditInfo[];
  savings: number;
  coApplicant?: CoApplicant;
}

/**
 * Types d'emploi
 */
export type EmploymentType = 'cdi' | 'cdd' | 'freelance' | 'retraite' | 'etudiant' | 'autre';

/**
 * Informations de crédit
 */
export interface CreditInfo {
  type: string;
  monthlyPayment: number;
  remainingBalance: number;
  institution: string;
}

/**
 * Co-candidat
 */
export interface CoApplicant {
  personalInfo: PersonalInfo;
  financialInfo: FinancialInfo;
  relationship: string;
}

/**
 * Garanties de candidature
 */
export interface Guarantees {
  type: GuaranteeType;
  amount?: number;
  provider?: string;
  validityDate?: Date;
  documents: Document[];
  status: 'pending' | 'valid' | 'invalid';
}

/**
 * Types de garanties
 */
export type GuaranteeType = 'caution' | 'garant_bancaire' | 'visale' | 'garant_physique';

/**
 * Interface pour les documents
 */
export interface Document {
  id: string;
  applicationId: string;
  type: DocumentType;
  name: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  uploadDate: Date;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
}

/**
 * Types de documents
 */
export type DocumentType =
  | 'piece_identite'
  | 'bulletin_salaire'
  | 'avis_imposition'
  | 'attestation_employeur'
  | 'garantie_bancaire'
  | 'releve_bancaire'
  | 'autre';

/**
 * Interface pour le score de candidature
 */
export interface ApplicationScore {
  globalScore: number;
  financialScore: number;
  stabilityScore: number;
  documentsScore: number;
  level: 'faible' | 'moyen' | 'bon' | 'excellent';
  factors: ScoreFactor[];
  calculatedAt: Date;
  lastUpdated: Date;
}

/**
 * Facteurs de score
 */
export interface ScoreFactor {
  name: string;
  weight: number;
  value: number;
  score: number;
  description: string;
}

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Fonction pour valider les types à l'exécution
 */
export function isUserData(obj: unknown): obj is UserData {
  if (typeof obj !== 'object' || obj === null) return false;
  const data = obj as UserData;
  return (
    typeof data.id === 'string' &&
    typeof data.email === 'string' &&
    typeof data.fullName === 'string' &&
    typeof data.role === 'string' &&
    typeof data.isVerified === 'boolean'
  );
}

/**
 * Fonction pour valider les données d'application
 */
export function isApplicationData(obj: unknown): obj is ApplicationData {
  if (typeof obj !== 'object' || obj === null) return false;
  const data = obj as ApplicationData;
  return (
    typeof data.id === 'string' &&
    typeof data.applicantId === 'string' &&
    typeof data.propertyId === 'string' &&
    typeof data.status === 'string'
  );
}

/**
 * Fonction pour valider les messages de chat
 */
export function isChatMessage(obj: unknown): obj is ChatMessage {
  if (typeof obj !== 'object' || obj === null) return false;
  const data = obj as ChatMessage;
  return (
    typeof data.id === 'string' &&
    typeof data.conversationId === 'string' &&
    typeof data.role === 'string' &&
    typeof data.content === 'string'
  );
}

/**
 * Fonction pour valider les activités utilisateur
 */
export function isActivityData(obj: unknown): obj is ActivityData {
  if (typeof obj !== 'object' || obj === null) return false;
  const data = obj as ActivityData;
  return (
    typeof data.id === 'string' && typeof data.userId === 'string' && typeof data.type === 'string'
  );
}
