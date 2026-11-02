/**
 * Service FINANCES propriétaire (domaine pilote FE-003 — ADR-0003).
 *
 * Fonctions pures, typées in/out : seules elles appellent `authFetch` pour ce
 * domaine. Un service n'importe aucun composant, ne connaît pas React.
 *
 * Sources de vérité du contrat :
 * - `src/app/api/owner/finances/route.ts`   → getOwnerFinances()
 * - `src/app/api/owner/analytics/route.ts`  → getOwnerAnalytics()
 * - `src/app/api/notifications/route.ts`    → sendPaymentReminder()
 *
 * Note R4 (ADR-0003) : `skipCache: true` sur les GET — React Query est
 * l'unique cache de l'écran migré, le cache maison response-cache.ts est
 * désactivé pour ces URLs.
 */

import { authFetch } from '@/lib/auth-fetch'
import type { Database } from '@/lib/supabase/types'

// ─── Types issus du schéma Supabase (types.ts régénéré — agent 4-c) ──────────

/** Statut d'un paiement (enum PostgreSQL `payment_status`). */
export type PaymentStatus = Database['public']['Enums']['payment_status']

/** Statuts agrégés par /api/owner/finances (PROCESSING n'y est jamais renvoyé). */
export type PaymentBreakdownStatus = Exclude<PaymentStatus, 'PROCESSING'>

/** Période demandée (ex. 'month' | 'quarter' | 'year' — filtre côté API à venir). */
export type FinancesPeriod = string

// ─── DTO /api/owner/finances ─────────────────────────────────────────────────

export interface MonthlyRevenue {
  month: string
  revenue: number
  collected: number
  pending: number
  late: number
}

export interface PaymentReminder {
  paymentId: string
  amount: number
  dueDate: string
  daysLate: number
  tenant: { id: string; name: string; phone: string | null }
  property: { id: string; title: string }
  reference: string | null
}

export interface RevenuePerProperty {
  propertyId: string
  propertyTitle: string
  city: string
  monthlyRent: number
  isRented: boolean
  collected: number
  pending: number
  late: number
  netRevenue: number
  commission: number
}

export interface CommissionMandat {
  mandatId: string
  mandatType: string
  propertyTitle: string
  agencyName: string
  commissionRate: number
  commissionType: string
  totalCollected: number
  commissionAmount: number
  period: string
}

export interface RecentPayment {
  id: string
  amount: number
  amountPaid?: number
  status: PaymentStatus
  dueDate: string
  paidAt: string | null
  reference: string | null
  createdAt: string
  lease: {
    id: string
    monthlyRent: number
    property: { id: string; title: string; city: string }
    tenant: { id: string; firstName: string; lastName: string }
  }
}

export interface OwnerFinancesData {
  monthlyRevenueHistory: MonthlyRevenue[]
  paymentStatusBreakdown: Record<PaymentBreakdownStatus, { count: number; amount: number }>
  commissionTracking: {
    mandats: CommissionMandat[]
    totalCommissionDue: number
  }
  revenuePerProperty: RevenuePerProperty[]
  paymentReminders: PaymentReminder[]
  recentPayments: RecentPayment[]
  summary: {
    totalCollected: number
    totalPending: number
    totalLate: number
    totalCommissionDue: number
    netRevenue: number
    propertiesCount: number
    rentedPropertiesCount: number
  }
}

// ─── DTO /api/owner/analytics ────────────────────────────────────────────────

export interface AnalyticsMonthlyRevenue {
  month: string
  revenue: number
  paid: number
  pending: number
}

export interface AnalyticsPropertyPerformance {
  propertyId: string
  propertyTitle: string
  city: string
  revenue: number
  occupancy: number
  visitCount: number
  activeLeases: number
  monthlyRent: number
}

export interface LatePaymentTrendPoint {
  month: string
  count: number
  amount: number
}

export interface OwnerAnalyticsData {
  occupancyRate: number
  monthlyRevenue: AnalyticsMonthlyRevenue[]
  averageLeaseDurationMonths: number
  perPropertyPerformance: AnalyticsPropertyPerformance[]
  latePaymentsTrend: LatePaymentTrendPoint[]
  totals: {
    totalRevenue: number
    totalPaid: number
    totalPending: number
    latePaymentsCount: number
    totalProperties: number
    rentedProperties: number
    activeLeases: number
  }
}

// ─── Fonctions du service ────────────────────────────────────────────────────

/**
 * Agrégats financiers du propriétaire connecté : revenus mensuels, répartition
 * des paiements, commissions (mandats actifs), revenus par bien, rappels,
 * derniers paiements.
 *
 * @param period période optionnelle — le filtre côté API est prévu mais pas
 *        encore implémenté dans la route (le paramètre est ignoré aujourd'hui).
 */
export async function getOwnerFinances(period?: FinancesPeriod): Promise<OwnerFinancesData> {
  const qs = period ? `?period=${encodeURIComponent(period)}` : ''
  return authFetch<OwnerFinancesData>(`/api/owner/finances${qs}`, { skipCache: true })
}

/**
 * Analytics du propriétaire connecté : taux d'occupation, revenus mensuels,
 * durée moyenne des baux, performance par bien, tendance des retards.
 */
export async function getOwnerAnalytics(period?: FinancesPeriod): Promise<OwnerAnalyticsData> {
  const qs = period ? `?period=${encodeURIComponent(period)}` : ''
  return authFetch<OwnerAnalyticsData>(`/api/owner/analytics${qs}`, { skipCache: true })
}

export interface SendPaymentReminderInput {
  /** Locataire destinataire (users.id). */
  userId: string
  /** Paiement concerné (payments.id) — entityId de la notification. */
  entityId: string
  /** Titre de la notification. */
  title: string
  /** Corps de la notification (rédigé par l'écran). */
  message: string
}

/** Envoie un rappel de paiement (notification PAYMENT_ALERT) à un locataire. */
export async function sendPaymentReminder(input: SendPaymentReminderInput): Promise<void> {
  await authFetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: input.userId,
      type: 'PAYMENT_ALERT',
      title: input.title,
      message: input.message,
      entityId: input.entityId,
    }),
  })
}
