'use client'

/**
 * Hook React Query — Finances propriétaire (domaine pilote FE-003 — ADR-0003).
 *
 * Consommation : `useOwnerFinances()` dans les écrans. La queryKey vient
 * exclusivement du registre `queryKeys` (aucune clé inline).
 * Realtime : les écrans invalident `queryKeys.finances.all` — jamais de
 * refetch manuel ni de setState métier dans un callback realtime.
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  getOwnerFinances,
  type FinancesPeriod,
  type OwnerFinancesData,
} from '@/services/proprietaire/finances'

/** Données mouvantes (paiements, rappels) — refetch léger : 30 s. */
const FINANCES_STALE_TIME = 30_000

interface UseOwnerFinancesOptions {
  /** Désactive la requête tant que la session n'est pas prête (ex. !isAuthenticated). */
  enabled?: boolean
}

export function useOwnerFinances(period?: FinancesPeriod, options?: UseOwnerFinancesOptions) {
  return useQuery<OwnerFinancesData, Error>({
    queryKey: queryKeys.finances.owner(period),
    queryFn: () => getOwnerFinances(period),
    staleTime: FINANCES_STALE_TIME,
    refetchOnWindowFocus: false,
    enabled: options?.enabled,
  })
}

/**
 * Sélecteur d'erreur propre : normalise un `unknown` en message affichable.
 * AuthError/AuthFetch conservent leur message utilisateur FR via `Error`.
 */
export function financesErrorMessage(error: unknown): string | null {
  if (!error) return null
  return error instanceof Error ? error.message : 'Erreur inconnue'
}
