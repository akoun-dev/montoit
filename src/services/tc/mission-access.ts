/**
 * Service MISSION-ACCESS — Tiers de Confiance (domaine TC-006, ADR-0003).
 *
 * Client API des liens d'accès éphémères d'une mission (Option C — agents de
 * terrain sans compte) :
 *   - GET    /api/tc/missions/[id]/access-link  → statut des tokens (badge TC)
 *   - POST   /api/tc/missions/[id]/access-link  → génère + envoie un lien
 *   - DELETE /api/tc/missions/[id]/access-link  → révoque (1 token ou tous)
 *
 * Sources de vérité du contrat :
 * - `src/app/api/tc/missions/[id]/access-link/route.ts` (TC-002, POST/DELETE ;
 *   GET ajouté en parallèle — contrat `{ tokens: [...] }`).
 * - `supabase/migrations/20261027000032_mission_access_tokens.sql`
 *   (opened_at / submitted_at / revoked_at — cycle envoyé/ouvert/rendu/expiré/révoqué).
 *
 * Fonctions pures, typées in/out : seules elles appellent `authFetch` pour ce
 * domaine. Un service n'importe aucun composant, ne connaît pas React.
 * R4 (ADR-0003) : `skipCache: true` sur les GET — React Query est l'unique cache.
 */

import { authFetch, AuthError } from '@/lib/auth-fetch'

// ─── Types — contrat de /api/tc/missions/[id]/access-link ────────────────────

/** Un lien d'accès éphémère (shape GET — snake_case, sans token_hash côté API). */
export interface MissionAccessToken {
  id: string
  /** Canal d'envoi : 'SMS' | 'EMAIL'. */
  channel: string
  expires_at: string
  opened_at: string | null
  submitted_at: string | null
  revoked_at: string | null
  created_at: string
}

interface TokensPayload {
  tokens?: MissionAccessToken[]
}

/** Statut dérivé d'un token pour les badges TC (TC-006). */
export type MissionTokenStatus = 'sent' | 'opened' | 'submitted' | 'expired' | 'revoked'

/** Canaux d'envoi supportés par la route (bornes serveur : SMS | EMAIL). */
export type MissionTokenChannel = 'SMS' | 'EMAIL'

// ─── GET : statut des liens d'une mission ────────────────────────────────────

/**
 * Liste des liens d'accès d'une mission (le plus récent en tête côté appelant).
 *
 * Dégradation gracieuse (TC-006) : tant que le GET n'est pas livré (405) ou si
 * la mission est introuvable (404), la fonction renvoie `null` — l'écran
 * n'affiche simplement pas de badge (feature flag implicite). Toute autre
 * erreur (401/403/5xx…) est levée : le service n'avale pas les erreurs réelles.
 *
 * @returns tableau de tokens, tableau vide si aucun lien, ou `null` si le
 *          endpoint GET est indisponible (404/405).
 */
export async function getMissionTokens(missionId: string): Promise<MissionAccessToken[] | null> {
  try {
    const data = await authFetch<TokensPayload | MissionAccessToken[]>(
      `/api/tc/missions/${encodeURIComponent(missionId)}/access-link`,
      { skipCache: true },
    )
    // Tolérant au contrat exact : `{ tokens: [...] }` ou tableau brut.
    if (Array.isArray(data)) return data
    return Array.isArray(data?.tokens) ? data.tokens : []
  } catch (error) {
    if (error instanceof AuthError && (error.status === 404 || error.status === 405)) {
      return null
    }
    throw error
  }
}

// ─── POST : générer / renvoyer un lien ───────────────────────────────────────

export interface SendMissionAccessLinkInput {
  /** TTL du lien en heures (1–168, défaut serveur 72 h). */
  expiresInHours?: number
  /** Canal d'envoi (défaut serveur : SMS). */
  channel?: MissionTokenChannel
}

export interface SendMissionAccessLinkResult {
  id: string
  /** ⚠️ Token clair — retourné UNE SEULE fois, jamais persisté côté serveur. */
  token: string
  /** Chemin relatif de la page de collecte : `/m/{token}`. */
  url: string
  channel: string
  expiresAt: string
  createdAt: string
  /** Nombre d'anciens liens actifs révoqués par la relance (TC-006). */
  revokedPrevious: number
}

/**
 * Génère (ou régénère) le lien d'accès d'une mission. Un seul lien actif par
 * mission : les tokens précédents non révoqués sont révoqués côté serveur.
 */
export async function sendMissionAccessLink(
  missionId: string,
  input?: SendMissionAccessLinkInput,
): Promise<SendMissionAccessLinkResult> {
  return authFetch<SendMissionAccessLinkResult>(
    `/api/tc/missions/${encodeURIComponent(missionId)}/access-link`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Corps optionnel côté route : `{}` conserve les défauts (SMS, 72 h).
      body: JSON.stringify(input ?? {}),
    },
  )
}

// ─── DELETE : révoquer ───────────────────────────────────────────────────────

export interface RevokeMissionAccessResult {
  /** Nombre de tokens effectivement révoqués. */
  revoked: number
}

/**
 * Révoque le lien actif d'une mission — un token précis (`tokenId`) ou, à
 * défaut, tous les tokens encore actifs de la mission (kill switch).
 */
export async function revokeMissionAccessLink(
  missionId: string,
  tokenId?: string,
): Promise<RevokeMissionAccessResult> {
  const qs = tokenId ? `?tokenId=${encodeURIComponent(tokenId)}` : ''
  return authFetch<RevokeMissionAccessResult>(
    `/api/tc/missions/${encodeURIComponent(missionId)}/access-link${qs}`,
    { method: 'DELETE' },
  )
}

// ─── Helpers purs (dérivation de statut — partagés par les écrans TC) ────────

/**
 * Dérive le statut affichable d'un token (priorité métier) :
 * révoqué > expiré > rendu > ouvert > envoyé.
 *
 * @param now injectable pour les tests.
 */
export function deriveTokenStatus(
  token: MissionAccessToken,
  now: Date = new Date(),
): MissionTokenStatus {
  if (token.revoked_at) return 'revoked'
  if (new Date(token.expires_at).getTime() < now.getTime()) return 'expired'
  if (token.submitted_at) return 'submitted'
  if (token.opened_at) return 'opened'
  return 'sent'
}

/**
 * Sélectionne le token « courant » d'une mission : le plus récent token
 * utilisable (non révoqué, non expiré), sinon le plus récent tout court
 * (pour afficher « Expiré » / « Révoqué » plutôt que rien).
 */
export function pickCurrentToken(
  tokens: MissionAccessToken[],
  now: Date = new Date(),
): MissionAccessToken | null {
  if (tokens.length === 0) return null
  const sorted = [...tokens].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  return (
    sorted.find((t) => {
      const status = deriveTokenStatus(t, now)
      return status !== 'revoked' && status !== 'expired'
    }) ?? sorted[0]
  )
}
