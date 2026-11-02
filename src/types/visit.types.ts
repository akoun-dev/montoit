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

export type VisitStatus = 'en_attente' | 'confirmee' | 'annulee' | 'terminee';

export const VISIT_STATUS_STYLES: Record<VisitStatus | string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  confirmee: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-800',
  terminee: 'bg-blue-100 text-blue-800',
};

export const VISIT_STATUS_LABELS: Record<VisitStatus | string, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  annulee: 'Annulée',
  terminee: 'Terminée',
};
