/**
 * Client API public — Missions via token (acteur AGENT_TERRAIN, sans compte).
 *
 * Contrat (implémenté en parallèle par TC-003 — ne jamais dévier) :
 * - GET  /api/missions-token/[token]
 *      200 { mission:{id,title,type,zone,scheduled_at,notes,status}, tc:{name},
 *            checklist:[{id,label}], expires_at, already_submitted }
 *      404 {error} | 410 {error:'EXPIRED'|'REVOKED'} | 429
 * - POST /api/missions-token/[token]  body {action:'start'} | {action:'submit', photos:string[], notes?:string}
 *      200 {ok:true, mission_status} | 404 | 410 | 409 (déjà soumis) | 429
 * - POST /api/missions-token/[token]/upload  multipart (champ `file`)
 *      200 {path:string} | 400 | 404 | 410 | 413 | 415 | 429
 *
 * Règles (guide data-layer, ADR-0003) :
 * - Le service est une couche pure : aucun import React, aucune UI.
 * - Pas d'authFetch ici : ces routes sont PUBLIQUES (l'acteur n'a pas de compte) —
 *   on n'utilise donc pas le wrapper authentifié, mais un fetch typé avec la même
 *   discipline d'erreurs (jamais de throw non typé : tout est `MissionTokenError`).
 * - Base URL Capacitor réutilisée (`@/lib/capacitor`) pour rester compatible app native.
 */

import { getApiBaseUrl } from '@/lib/capacitor'

// ── DTOs (reflet exact du contrat TC-003) ────────────────────────────────────

export interface MissionChecklistItemDTO {
  id: string
  label: string
}

export interface MissionFicheDTO {
  mission: {
    id: string
    title: string
    type: string
    zone: string
    scheduled_at: string | null
    notes: string | null
    status: string
  }
  tc: {
    name: string
  }
  checklist: MissionChecklistItemDTO[]
  expires_at: string
  already_submitted: boolean
}

export interface MissionActionResponseDTO {
  ok: boolean
  mission_status: string
}

export interface MissionPhotoUploadDTO {
  path: string
}

export interface SubmitMissionPayload {
  /** Chemins Storage des photos déjà uploadées (≥ 1 — spec TC-001 §8 : photos obligatoires). */
  photos: string[]
  notes?: string
}

// ── Erreurs typées (jamais de throw non typé) ────────────────────────────────

export type MissionTokenErrorCode =
  | 'BAD_REQUEST' // 400
  | 'NOT_FOUND' // 404
  | 'ALREADY_SUBMITTED' // 409
  | 'EXPIRED' // 410 + {error:'EXPIRED'}
  | 'REVOKED' // 410 + {error:'REVOKED'}
  | 'PAYLOAD_TOO_LARGE' // 413
  | 'UNSUPPORTED_MEDIA_TYPE' // 415
  | 'RATE_LIMITED' // 429
  | 'SERVER' // 5xx
  | 'NETWORK' // fetch impossible / timeout / réponse illisible
  | 'UNKNOWN'

export class MissionTokenError extends Error {
  /** Code HTTP (0 si échec réseau avant réponse). */
  readonly status: number
  /** Code sémantique stable pour l'UI (écrans dédiés 404 / expiré / révoqué / déjà soumis). */
  readonly code: MissionTokenErrorCode

  constructor(status: number, code: MissionTokenErrorCode, message: string) {
    super(message)
    this.name = 'MissionTokenError'
    this.status = status
    this.code = code
  }
}

/** Statuts "définitifs" : inutile de retenter automatiquement (le hook s'en sert pour `retry: false`). */
export const MISSION_TOKEN_NON_RETRYABLE_STATUSES: ReadonlySet<number> = new Set([
  400, 404, 409, 410, 413, 415, 429,
])

function errorFromResponse(status: number, body: unknown): MissionTokenError {
  const serverError =
    typeof body === 'object' && body !== null && 'error' in body
      ? String((body as { error: unknown }).error)
      : undefined

  switch (status) {
    case 400:
      return new MissionTokenError(400, 'BAD_REQUEST', 'Requête invalide. Vérifiez le formulaire puis réessayez.')
    case 404:
      return new MissionTokenError(404, 'NOT_FOUND', 'Mission introuvable ou lien invalide.')
    case 409:
      return new MissionTokenError(409, 'ALREADY_SUBMITTED', 'Ce rapport a déjà été envoyé.')
    case 410:
      return serverError === 'REVOKED'
        ? new MissionTokenError(410, 'REVOKED', 'Ce lien a été annulé par votre Tiers de Confiance.')
        : new MissionTokenError(410, 'EXPIRED', 'Ce lien a expiré. Demandez un nouveau lien à votre Tiers de Confiance.')
    case 413:
      return new MissionTokenError(413, 'PAYLOAD_TOO_LARGE', 'Photo trop volumineuse (8 Mo maximum par photo).')
    case 415:
      return new MissionTokenError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Format non pris en charge. Utilisez une image (JPG, PNG, WEBP).')
    case 429:
      return new MissionTokenError(429, 'RATE_LIMITED', 'Trop de tentatives. Patientez un instant avant de réessayer.')
    default:
      return new MissionTokenError(status, 'SERVER', 'Le service est momentanément indisponible. Réessayez dans un instant.')
  }
}

// ── Transport ────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  init?: RequestInit & { timeout?: number },
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), init?.timeout ?? 20_000)

  try {
    const base = getApiBaseUrl()
    const response = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
    })

    const text = await response.text()
    let body: unknown = null
    if (text.length > 0) {
      try {
        body = JSON.parse(text)
      } catch {
        body = null // corps non JSON (page d'erreur HTML, etc.)
      }
    }

    if (!response.ok) {
      throw errorFromResponse(response.status, body)
    }
    return body as T
  } catch (error) {
    if (error instanceof MissionTokenError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new MissionTokenError(0, 'NETWORK', 'La connexion a pris trop de temps. Réessayez.')
    }
    throw new MissionTokenError(0, 'NETWORK', 'Connexion impossible. Vérifiez votre réseau puis réessayez.')
  } finally {
    clearTimeout(timer)
  }
}

function tokenPath(token: string, suffix = ''): string {
  return `/api/missions-token/${encodeURIComponent(token)}${suffix}`
}

// ── Fonctions du domaine ─────────────────────────────────────────────────────

/** GET — Fiche mission pour l'agent de terrain (périmètre borné à UNE mission). */
export async function getMissionFiche(token: string): Promise<MissionFicheDTO> {
  return request<MissionFicheDTO>(tokenPath(token), { method: 'GET' })
}

/** POST {action:'start'} — Passe la mission ASSIGNED → IN_PROGRESS (une seule fois côté UI). */
export async function startMission(token: string): Promise<MissionActionResponseDTO> {
  return request<MissionActionResponseDTO>(tokenPath(token), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start' }),
  })
}

/** POST {action:'submit'} — Envoie le rapport (photos = chemins Storage, ≥ 1). */
export async function submitMission(
  token: string,
  payload: SubmitMissionPayload,
): Promise<MissionActionResponseDTO> {
  return request<MissionActionResponseDTO>(tokenPath(token), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'submit', ...payload }),
  })
}

/** POST multipart — Upload d'UNE photo ; renvoie son chemin Storage (bucket privé mission-evidence). */
export async function uploadMissionPhoto(token: string, file: File): Promise<MissionPhotoUploadDTO> {
  const formData = new FormData()
  formData.append('file', file)
  return request<MissionPhotoUploadDTO>(tokenPath(token, '/upload'), {
    method: 'POST',
    body: formData,
    timeout: 60_000, // 3G + photo haute résolution
  })
}
