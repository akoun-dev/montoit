import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getClientIp } from '@/lib/rate-limiter'
import {
  hashMissionToken,
  verifyMissionToken,
} from '@/lib/token-access'

/**
 * TC-003 — Garde-fou commun aux routes publiques /api/missions-token/*.
 *
 * Résout un token de mission (path param base64url) vers sa ligne
 * `mission_access_tokens` (service_role), applique la vérification
 * fail-closed de `src/lib/token-access.ts` et tient la télémétrie
 * `last_used_at` à jour.
 *
 * Aucune dépendance au code dashboard / middleware : ces routes servent
 * l'acteur AGENT_TERRAIN (sans compte), identifié par le seul token.
 *
 * Réponses d'erreur normalisées JSON { error: string } — jamais de stack,
 * jamais de détail interne (le motif exact NOT_FOUND/EXPIRED/REVOKED est
 * le contrat d'interface TC-003).
 */

/** Token = 32 octets aléatoires encodés base64url (43 caractères URL-safe). */
export const MISSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

/** Ligne mission_access_tokens lue par le serveur (service_role). */
export interface MissionTokenRecordRow {
  id: string
  mission_id: string
  token_hash: string
  channel: string
  expires_at: string
  opened_at: string | null
  submitted_at: string | null
  revoked_at: string | null
  created_at: string
  last_used_at: string | null
}

export type MissionTokenResolution =
  | { ok: true; record: MissionTokenRecordRow }
  | { ok: false; response: NextResponse }

function tokenErrorResponse(status: number, error: string): NextResponse {
  const response = NextResponse.json({ error }, { status })
  response.headers.set('Cache-Control', 'no-store')
  return response
}

/**
 * Vérifie le format du token SANS toucher au pepper : un token malformé ne
 * peut pas exister en base → 404 immédiat (même sémantique que NOT_FOUND).
 */
export function isWellFormedMissionToken(token: string): boolean {
  return MISSION_TOKEN_PATTERN.test(token)
}

/**
 * Résout et vérifie un token de mission :
 *   1. format base64url (sinon 404 NOT_FOUND, sans consulter le pepper) ;
 *   2. hash + lookup unique par token_hash (service_role) ;
 *   3. verifyMissionToken → VALID | NOT_FOUND | EXPIRED | REVOKED
 *      (fail-closed : pepper absent → exception → 503) ;
 *   4. télémétrie last_used_at mise à jour (fire-and-forget, jamais bloquant).
 *
 * Les erreurs 4xx/5xx sont déjà des NextResponse prêtes à retourner.
 */
export async function resolveMissionToken(
  token: string
): Promise<MissionTokenResolution> {
  // 1) Format — anti-sondage : toute valeur non conforme est un 404 générique.
  if (!isWellFormedMissionToken(token)) {
    return {
      ok: false,
      response: tokenErrorResponse(404, 'NOT_FOUND'),
    }
  }

  const supabase = getSupabaseAdminClient()

  // 2) Lookup par empreinte (fail-closed si pepper absent : hashMissionToken lève).
  let tokenHash: string
  try {
    tokenHash = hashMissionToken(token)
  } catch (error) {
    console.error(
      '[missions-token] Pepper manquant (fail-closed) :',
      error instanceof Error ? error.message : error
    )
    return {
      ok: false,
      response: tokenErrorResponse(
        503,
        'Service indisponible : configuration du serveur incomplète'
      ),
    }
  }

  const { data: record } = await ((supabase as any)
    .from('mission_access_tokens')
    .select(
      'id, mission_id, token_hash, channel, expires_at, opened_at, submitted_at, revoked_at, created_at, last_used_at'
    )
    .eq('token_hash', tokenHash)
    .maybeSingle() as any)

  // 3) Vérification centrale (hash + révocation + TTL).
  const verdict = verifyMissionToken(token, record ?? null)
  if (!verdict.valid || !record) {
    const status = verdict.reason === 'EXPIRED' ? 410 : verdict.reason === 'REVOKED' ? 410 : 404
    return {
      ok: false,
      response: tokenErrorResponse(status, verdict.reason),
    }
  }

  // 4) Télémétrie anti-rejeu : last_used_at à chaque usage du token
  //    (GET fiche, POST start/submit, POST upload). Non bloquant.
  void ((supabase as any)
    .from('mission_access_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', record.id) as Promise<unknown>).catch((error: unknown) => {
    console.error('[missions-token] last_used_at update failed:', error)
  })

  return { ok: true, record: record as MissionTokenRecordRow }
}

/** Clé de rate-limit par IP (SEC-007 : x-forwarded-for → x-real-ip → 127.0.0.1). */
export function missionTokenIpKey(request: NextRequest): string {
  return getClientIp(request)
}
