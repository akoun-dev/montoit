import { AddressValue } from '@/shared/utils/address';

/**
 * Types pour les visites (MyVisitsPage)
 */

// =====================================================
// Types pour les requêtes Supabase
// =====================================================

export interface VisitPropertyJoin {
  id: string;
  title: string;
  address: AddressValue;
  city: string;
  main_image: string | null;
}

export interface VisitQueryResult {
  id: string;
  property_id: string;
  visit_type: string | null;
  visit_date: string;
  visit_time: string;
  confirmed_date?: string | null;
  created_at?: string | null;
  status: string | null;
  notes: string | null;
  feedback: string | null;
  rating: number | null;
  properties: VisitPropertyJoin;
}

// =====================================================
// Types pour l'affichage
// =====================================================

export interface Visit {
  id: string;
  property_id: string;
  visit_type: string;
  visit_date: string;
  visit_time: string;
  status: string;
  notes: string | null;
  feedback: string | null;
  rating: number | null;
  property: VisitPropertyJoin;
}

export type VisitFilter = 'all' | 'upcoming' | 'past';

export type VisitStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export const VISIT_STATUS_STYLES: Record<VisitStatus | string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-neutral-100 text-neutral-700',
};

export const VISIT_STATUS_LABELS: Record<VisitStatus | string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
  no_show: 'Absent',
};
