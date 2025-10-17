/**
 * Types pour la gestion des agences et mandats
 */

export interface AgencyMandatePermissions {
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

export type MandateType = 'location' | 'gestion_complete' | 'vente';
export type MandateStatus = 'pending' | 'active' | 'suspended' | 'terminated' | 'expired';
export type BillingFrequency = 'mensuel' | 'trimestriel' | 'annuel' | 'par_transaction';

export interface CreateMandateInput {
  agency_id: string;
  property_id?: string | null;
  mandate_type: MandateType;
  commission_rate?: number;
  fixed_fee?: number;
  billing_frequency?: BillingFrequency;
  permissions?: Partial<AgencyMandatePermissions>;
  start_date: string;
  end_date?: string | null;
  notes?: string;
}

export interface MandateStats {
  totalMandates: number;
  activeMandates: number;
  pendingMandates: number;
  totalProperties: number;
  totalOwners: number;
}
