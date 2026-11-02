'use client'

/**
 * Hooks React Query — Liens d'accès éphémères des missions TC (TC-006 — ADR-0003).
 *
 * Consommation : `useMissionTokens(missionId)` / `useResendToken(missionId)` /
 * `useRevokeToken(missionId)` dans les écrans TC. La queryKey vient
 * exclusivement du registre `queryKeys` (aucune clé inline).
 *
 * Le hook `useMissionTokens` n'est activé que quand le panneau qui l'utilise
 * est visible (`enabled`), avec un refetch léger de 30 s — interrompu si le
 * GET n'est pas encore disponible (404/405 → `data: null`) pour ne pas poller
 * inutilement (dégradation gracieuse).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  getMissionTokens,
  sendMissionAccessLink,
  revokeMissionAccessLink,
  type MissionAccessToken,
  type RevokeMissionAccessResult,
  type SendMissionAccessLinkInput,
  type SendMissionAccessLinkResult,
} from '@/services/tc/mission-access'

/** Données mouvantes (l'agent peut ouvrir/rendre à tout moment) — 30 s. */
const TOKENS_REFETCH_INTERVAL_MS = 30_000

export interface UseMissionTokensOptions {
  /** N'active la requête que quand le panneau est visible (défaut : actif). */
  enabled?: boolean
  /** Surcharge du polling en ms — `false` pour désactiver. Défaut : 30 s. */
  refetchInterval?: number | false
}

/**
 * Statut des liens d'accès d'une mission.
 * - `undefined` : en cours de chargement (première fetch).
 * - `null`      : GET indisponible (404/405) — feature flag implicite.
 * - `array`     : liens de la mission (éventuellement vide).
 */
export function useMissionTokens(
  missionId: string | null | undefined,
  options?: UseMissionTokensOptions,
) {
  const id = missionId ?? ''
  return useQuery<MissionAccessToken[] | null, Error>({
    queryKey: queryKeys.tc.missionTokens(id),
    queryFn: () => getMissionTokens(id),
    enabled: Boolean(missionId) && options?.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (options?.refetchInterval !== undefined) return options.refetchInterval
      // GET absent (404/405 → data null) ou requête en erreur : stop polling.
      if (query.state.data === null || query.state.error) return false
      return TOKENS_REFETCH_INTERVAL_MS
    },
  })
}

/**
 * Génère / régénère le lien d'accès d'une mission (POST). Les anciens liens
 * actifs sont révoqués côté serveur. Invalide le statut des tokens au succès.
 */
export function useResendToken(missionId: string) {
  const queryClient = useQueryClient()
  return useMutation<SendMissionAccessLinkResult, Error, SendMissionAccessLinkInput | undefined>({
    mutationFn: (input) => sendMissionAccessLink(missionId, input ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tc.missionTokens(missionId) })
    },
  })
}

/**
 * Révoque un lien précis (`tokenId`) ou tous les liens actifs de la mission
 * (DELETE). Invalide le statut des tokens au succès.
 */
export function useRevokeToken(missionId: string) {
  const queryClient = useQueryClient()
  return useMutation<RevokeMissionAccessResult, Error, string | undefined>({
    mutationFn: (tokenId) => revokeMissionAccessLink(missionId, tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tc.missionTokens(missionId) })
    },
  })
}

/**
 * Sélecteur d'erreur propre : normalise un `unknown` en message affichable.
 * AuthError conserve son message utilisateur FR via `Error`.
 */
export function missionAccessErrorMessage(error: unknown): string | null {
  if (!error) return null
  return error instanceof Error ? error.message : 'Erreur inconnue'
}
