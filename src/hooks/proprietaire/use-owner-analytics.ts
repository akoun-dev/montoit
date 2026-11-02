'use client'

/**
 * Hook React Query — Analytics propriétaire (domaine pilote FE-003 — ADR-0003).
 *
 * Agrégats moins volatils que les paiements → staleTime long (5 min).
 * Le hook est prêt ; le branchement de l'écran `analytics.tsx` est planifié
 * au sprint suivant (migration par domaine, R2/R3 ADR-0003).
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  getOwnerAnalytics,
  type FinancesPeriod,
  type OwnerAnalyticsData,
} from '@/services/proprietaire/finances'

/** Agrégats analytics — 5 min de fraîcheur suffit. */
const ANALYTICS_STALE_TIME = 5 * 60_000

interface UseOwnerAnalyticsOptions {
  /** Désactive la requête tant que la session n'est pas prête (ex. !isAuthenticated). */
  enabled?: boolean
}

export function useOwnerAnalytics(period?: FinancesPeriod, options?: UseOwnerAnalyticsOptions) {
  return useQuery<OwnerAnalyticsData, Error>({
    queryKey: queryKeys.finances.ownerAnalytics(period),
    queryFn: () => getOwnerAnalytics(period),
    staleTime: ANALYTICS_STALE_TIME,
    refetchOnWindowFocus: false,
    enabled: options?.enabled,
  })
}

/** Sélecteur d'erreur propre : normalise un `unknown` en message affichable. */
export function ownerAnalyticsErrorMessage(error: unknown): string | null {
  if (!error) return null
  return error instanceof Error ? error.message : 'Erreur inconnue'
}
