/**
 * Shared TypeScript types and interfaces
 * These are application-level types, not database types
 */

// Export type modules
export * from './admin';
export * from './auth';
export * from './property';
export * from './user';

import type { Database } from './database.types';

// Re-export database types for convenience
export type Property = Database['public']['Tables']['properties']['Row'];
export type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
export type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Use lease_contracts instead of leases
export type Lease = Database['public']['Tables']['lease_contracts']['Row'];
export type LeaseInsert = Database['public']['Tables']['lease_contracts']['Insert'];
export type LeaseUpdate = Database['public']['Tables']['lease_contracts']['Update'];

export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// Application-specific types

export interface PropertyFilters {
  propertyType?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  searchQuery?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type PropertyStatus = 'available' | 'rented' | 'maintenance' | 'unavailable';
export type LeaseStatus = 'draft' | 'pending' | 'active' | 'expired' | 'terminated';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type UserType = 'tenant' | 'owner' | 'agency';

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignUpFormData extends LoginFormData {
  fullName: string;
  userType: UserType;
  confirmPassword: string;
}

export interface PropertyFormData {
  title: string;
  description: string;
  propertyType: string;
  address: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  surface: number;
  images: File[];
}

// Notification types for applications
export type NotificationType =
  | 'application_received'
  | 'application_status_change'
  | 'document_reminder'
  | 'contract_deadline'
  | 'new_message'
  | 'payment_reminder'
  | 'lease_expiry';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ApplicationNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  read_at: string | null;
  action_url: string | null;
  action_label: string | null;
  metadata: {
    property_id?: string;
    application_id?: string;
    contract_id?: string;
    message_id?: string;
    due_date?: string;
    amount?: number;
    document_type?: string;
  };
  priority: NotificationPriority;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  sound_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  notification_types: {
    [key in NotificationType]: {
      email: boolean;
      push: boolean;
      sound: boolean;
    };
  };
}

export interface NotificationFilter {
  type?: NotificationType;
  priority?: NotificationPriority;
  read?: boolean;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncFunction<T = void> = () => Promise<T>;

// Re-export application types (excluding ApplicationNotification which is defined locally)
export type {
  Application,
  ApplicationStatus,
  ApplicationStep,
  DocumentType,
  ApplicationScoreLevel,
  ApplicationMetadata,
  Document,
  ApplicationScore,
  ScoreFactor,
  PersonalInfo,
  Address,
  EmergencyContact,
  FinancialInfo,
  CreditInfo,
  CoApplicant,
  Guarantees,
  ApplicationFormData,
  ApplicationFilters,
  ApplicationPagination,
  PaginatedApplications,
  ApplicationStats,
  ValidationErrors,
  CreateApplicationResponse,
  UpdateApplicationResponse,
  UploadDocumentResponse,
  UseApplicationsOptions,
  UseApplicationsReturn,
} from './application';

// Re-export monToit types
export * from './monToit.types';

// Re-export payment types (excluding conflicting ones)
export type {
  PaymentRequest,
  PaymentResponse,
  PaymentCalculation,
  PaymentError,
  PaymentFilters,
  PaymentReceipt,
  MobileMoneyProvider,
  PaymentErrorCode,
} from './payment.types';
