/**
 * Admin-specific type definitions for Mon Toit
 * Provides strict typing for admin components to replace any types
 */

import type { Database } from '@/integrations/supabase/types';

// Database enums
export type VerificationStatus = 'not_submitted' | 'pending_review' | 'verified' | 'rejected';
export type VerificationType = 'oneci' | 'cnam' | 'passport';

// Verification data structures
export interface ONECIData {
  lastName: string;
  firstName: string;
  birthDate: string;
  gender?: string;
  nationality?: string;
}

export interface CNAMData {
  contractType: string;
  estimatedSalary: number;
  employmentStatus: 'active' | 'inactive' | 'pending';
  startDate?: string;
}

export interface PassportData {
  lastName: string;
  firstName: string;
  birthDate: string;
  issueDate: string;
  expiryDate: string;
  nationality: string;
}

// Verification entities
export interface VerificationWithUser {
  user_id: string;
  oneci_status: VerificationStatus;
  cnam_status: VerificationStatus;
  passport_status: VerificationStatus;
  oneci_data: ONECIData | null;
  cnam_data: CNAMData | null;
  passport_data: PassportData | null;
  oneci_cni_number: string | null;
  cnam_employer: string | null;
  passport_number: string | null;
  passport_nationality: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
}

export interface PassportVerification {
  user_id: string;
  full_name: string;
  passport_number: string;
  passport_nationality: string;
  passport_status: VerificationStatus;
  passport_data: PassportData | null;
  created_at: string;
}

export interface VerificationAction {
  userId: string;
  type: VerificationType;
  action: 'approve' | 'reject';
}

// Agency types
export interface Agency {
  id: string;
  full_name: string;
  user_type: 'agence';
  city: string | null;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface MandateSubmission {
  agency_id: string;
  property_id?: string | null;
  mandate_type: 'location' | 'gestion_complete' | 'vente';
  start_date: string;
  end_date?: string | null;
  commission_rate?: number;
  fixed_fee?: number;
  billing_frequency?: 'mensuel' | 'trimestriel' | 'annuel' | 'par_transaction';
  permissions: MandatePermissions;
  notes?: string;
}

export interface MandatePermissions {
  can_view_properties: boolean;
  can_edit_properties: boolean;
  can_create_properties: boolean;
  can_delete_properties: boolean;
  can_view_applications: boolean;
  can_manage_applications: boolean;
  can_create_leases: boolean;
  can_view_financials: boolean;
  can_manage_maintenance: boolean;
  can_communicate_tenants: boolean;
  can_manage_documents: boolean;
}

// Property admin types
export interface PropertyUpdatePreview {
  title: string;
  current: string;
  new: string;
}

export interface BulkPropertyUpdate {
  id: string;
  monthly_rent?: number;
  status?: string;
}

// Report generator types
export interface Owner {
  id: string;
  full_name: string;
  email: string;
}

// Agency Mandate (from database)
export type AgencyMandate = Database['public']['Tables']['agency_mandates']['Row'];
