/**
 * Types TypeScript pour le système de candidature
 */

import type { Database } from '@/shared/lib/database.types';

// Type pour les erreurs API
export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

// Types de base pour les candidatures
export type ApplicationStatus = 'en_attente' | 'en_cours' | 'acceptee' | 'refusee' | 'annulee';

export type ApplicationStep =
  | 'informations_personnelles'
  | 'situation_financiere'
  | 'garanties'
  | 'documents'
  | 'validation';

export type DocumentType =
  | 'piece_identite'
  | 'bulletin_salaire'
  | 'avis_imposition'
  | 'attestation_employeur'
  | 'garantie_bancaire'
  | 'autre';

export type ApplicationScoreLevel = 'faible' | 'moyen' | 'bon' | 'excellent';

// Interface principale Application
export interface Application {
  id: string;
  propertyId: string;
  applicantId: string;
  status: ApplicationStatus;
  steps: ApplicationStep[];
  currentStep: ApplicationStep;
  documents: Document[];
  createdAt: Date;
  updatedAt: Date;
  metadata: ApplicationMetadata;
  score?: ApplicationScore;
  notifications: ApplicationNotification[];
}

// Métadonnées de l'application
export interface ApplicationMetadata {
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  submittedFrom: 'web' | 'mobile' | 'admin';
  priority: 'normale' | 'elevee' | 'urgente';
  notes?: string;
  adminNotes?: string;
}

// Document de candidature
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

// Score de candidature
export interface ApplicationScore {
  globalScore: number; // 0-100
  financialScore: number;
  stabilityScore: number;
  guaranteeScore: number;
  level: ApplicationScoreLevel;
  factors: ScoreFactor[];
  calculatedAt: Date;
}

// Facteurs influençant le score
export interface ScoreFactor {
  name: string;
  weight: number;
  value: number;
  score: number;
}

// Informations personnelles
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

// Adresse
export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

// Contact d'urgence
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

// Situation financière
export interface FinancialInfo {
  monthlyIncome: number;
  employmentType: 'cdi' | 'cdd' | 'freelance' | 'retraite' | 'etudiant' | 'autre';
  employer?: string;
  employmentStartDate?: Date;
  monthlyExpenses: number;
  existingCredits: CreditInfo[];
  savings: number;
  coApplicant?: CoApplicant;
}

// Informations de crédit
export interface CreditInfo {
  type: string;
  monthlyPayment: number;
  remainingBalance: number;
}

// Co-candidat
export interface CoApplicant {
  personalInfo: PersonalInfo;
  financialInfo: FinancialInfo;
}

// Garanties
export interface Guarantees {
  type: 'caution' | 'garant_bancaire' | 'visale' | 'garant_physique';
  amount?: number;
  provider?: string;
  validityDate?: Date;
  documents: Document[];
  status: 'en_attente' | 'valide' | 'refuse';
}

// Notifications de candidature
export interface ApplicationNotification {
  id: string;
  applicationId: string;
  type: 'status_change' | 'document_required' | 'interview_scheduled' | 'general';
  title: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
  actionUrl?: string;
}

// Formulaire de candidature
export interface ApplicationFormData {
  personalInfo: PersonalInfo;
  financialInfo: FinancialInfo;
  guarantees: Guarantees;
  documents: File[];
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

// Filtres de recherche de candidatures
export interface ApplicationFilters {
  status?: ApplicationStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  minScore?: number;
  propertyId?: string;
  searchQuery?: string;
  priority?: 'normale' | 'elevee' | 'urgente';
}

// Pagination des candidatures
export interface ApplicationPagination {
  page: number;
  pageSize: number;
  sortBy: 'created_at' | 'updated_at' | 'score' | 'status';
  sortOrder: 'asc' | 'desc';
}

// Résultat paginé des candidatures
export interface PaginatedApplications {
  data: Application[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Statistiques de candidature
export interface ApplicationStats {
  total: number;
  en_attente: number;
  en_cours: number;
  acceptee: number;
  refusee: number;
  annulee: number;
  averageScore: number;
  conversionRate: number;
  averageProcessingTime: number; // en jours
}

// Validation des formulaires
export interface ValidationErrors {
  [field: string]: string | ValidationErrors;
}

// API Response types
export interface CreateApplicationResponse {
  data?: Application;
  error?: ApiError;
}

export interface UpdateApplicationResponse {
  data?: Application;
  error?: ApiError;
}

export interface UploadDocumentResponse {
  data?: Document;
  error?: ApiError;
}

// Hook types
export interface UseApplicationsOptions {
  filters?: ApplicationFilters;
  pagination?: ApplicationPagination;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseApplicationsReturn {
  applications: Application[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createApplication: (data: ApplicationFormData) => Promise<Application>;
  updateApplication: (id: string, updates: Partial<Application>) => Promise<Application>;
  uploadDocument: (applicationId: string, file: File, type: DocumentType) => Promise<Document>;
  calculateScore: (applicationId: string) => Promise<ApplicationScore>;
  deleteApplication: (id: string) => Promise<void>;
}

// Constants réexportées
export type { Database };
