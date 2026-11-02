'use client'

/**
 * Hooks React Query — Missions via token (acteur AGENT_TERRAIN, page publique /m/[token]).
 *
 * - queryKey issue EXCLUSIVEMENT du registre `@/lib/query-keys` (missionToken.*).
 * - Erreurs typées `MissionTokenError` (jamais de throw non typé côté service).
 * - `useMissionFiche` : retry désactivé sur 404/410/409/429 (statuts définitifs),
 *   2 tentatives max sur erreurs réseau/serveur.
 * - Mutations : invalidation de la fiche après succès (React Query = cache unique, ADR-0003).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'
import {
  MISSION_TOKEN_NON_RETRYABLE_STATUSES,
  MissionTokenError,
  getMissionFiche,
  startMission,
  submitMission,
  uploadMissionPhoto,
  type MissionActionResponseDTO,
  type MissionFicheDTO,
  type MissionPhotoUploadDTO,
  type SubmitMissionPayload,
} from '@/services/tc/mission-token'

/** Fiche stable pendant la saisie — 30 s (défaut global FE-003), refetch à la reconnexion. */
const MISSION_TOKEN_STALE_TIME = 30_000

export function useMissionFiche(
  token: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery<MissionFicheDTO, MissionTokenError>({
    queryKey: queryKeys.missionToken.fiche(token ?? ''),
    queryFn: () => getMissionFiche(token ?? ''),
    enabled: Boolean(token) && (options?.enabled ?? true),
    staleTime: MISSION_TOKEN_STALE_TIME,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof MissionTokenError && MISSION_TOKEN_NON_RETRYABLE_STATUSES.has(error.status)) {
        return false
      }
      return failureCount < 2
    },
  })
}

/** POST start — ASSIGNED → IN_PROGRESS. Invalide la fiche pour refléter le nouveau statut. */
export function useStartMission(token: string) {
  const queryClient = useQueryClient()
  return useMutation<MissionActionResponseDTO, MissionTokenError>({
    mutationFn: () => startMission(token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.missionToken.fiche(token) })
    },
  })
}

/** POST submit — Rapport final (photos + notes). Invalide la fiche (statut COMPLETED). */
export function useSubmitMission(token: string) {
  const queryClient = useQueryClient()
  return useMutation<MissionActionResponseDTO, MissionTokenError, SubmitMissionPayload>({
    mutationFn: (payload) => submitMission(token, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.missionToken.fiche(token) })
    },
  })
}

/** POST upload — Une photo à la fois (permet un retry fin par photo en cas d'échec réseau). */
export function useUploadMissionPhoto(token: string) {
  const queryClient = useQueryClient()
  return useMutation<MissionPhotoUploadDTO, MissionTokenError, File>({
    mutationFn: (file) => uploadMissionPhoto(token, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.missionToken.fiche(token) })
    },
  })
}

/** Sélecteur d'erreur : normalise un `unknown` en message FR affichable (aria-live). */
export function missionTokenErrorMessage(error: unknown): string | null {
  if (!error) return null
  if (error instanceof MissionTokenError) return error.message
  if (error instanceof Error) return error.message
  return 'Erreur inconnue'
}
