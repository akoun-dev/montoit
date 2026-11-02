import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import {
  generateMissionToken,
  MISSION_TOKEN_TTL_HOURS,
} from '@/lib/token-access'

// TC-002 (Option C, spec TC-001) — Gestion des liens d'accès éphémères d'une
// mission par le Tiers de Confiance.
//
// GET    : statuts des liens de la mission pour le badge TC-006
//          (envoyé / ouvert / rendu / révoqué / expiré) — JAMAIS le token
//          brut ni son hash (TC-003).
// POST   : génère un token (32 octets aléatoires), le stocke HASHÉ dans
//          mission_access_tokens et retourne le token CLAIR une seule fois
//          (jamais persisté). Un seul lien actif par mission : les tokens
//          précédents non révoqués sont révoqués (relance, TC-006).
// DELETE : révoque un token précis (tokenId) ou tous les tokens actifs de la
//          mission.
//
// La page mobile /m/[token] et les routes publiques de collecte sont
// implémentées dans /api/missions-token/[token] (TC-003).

const TTL_HOURS_MIN = 1
const TTL_HOURS_MAX = 168 // 7 jours max
const CHANNELS = ['SMS', 'EMAIL'] as const

// Même pattern d'autorisation que src/app/api/tc/missions/route.ts
async function authorizeTC(request: NextRequest) {
  const { userId, applyCookies } = await resolveRequestUser(request)
  if (!userId) return { error: applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 })) }

  const supabase = getSupabaseAdminClient()
  const { data: profile } = await ((supabase as any)
    .from('users')
    .select('role, active_role')
    .eq('id', userId)
    .single() as any)

  const effectiveRole = profile?.active_role || profile?.role
  if (effectiveRole !== 'TIERS_CONFIANCE')
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }

  return { userId, applyCookies, supabase }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // TC-003 — Statuts des liens pour l'UI TC (badge envoyé/ouvert/rendu,
  // relance TC-006). Même pattern d'autorisation que POST/DELETE :
  // TC hors owner → 403 (critère QA TC-003, spec TC-001 §8).
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { applyCookies, supabase } = auth
  const { id: missionId } = await params

  try {
    const { data: mission } = await ((supabase as any)
      .from('missions')
      .select('id, tc_id')
      .eq('id', missionId)
      .maybeSingle() as any)

    if (!mission) {
      const resp = NextResponse.json({ error: 'Mission introuvable' }, { status: 404 })
      return applyCookies(resp)
    }
    if (mission.tc_id !== auth.userId) {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    // Colonnes de STATUT uniquement : token_hash est masqué par les grants
    // colonne (migration 20261027000032) et n'est JAMAIS sélectionné ici —
    // le token clair n'existe que dans la réponse du POST de génération.
    const { data: tokens, error } = await ((supabase as any)
      .from('mission_access_tokens')
      .select(
        'id, channel, expires_at, opened_at, submitted_at, revoked_at, created_at'
      )
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false }) as any)

    if (error) {
      console.error('[TC Missions AccessLink GET] Error:', error)
      const resp = NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
      return applyCookies(resp)
    }

    const resp = NextResponse.json({ tokens: tokens ?? [] })
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Missions AccessLink GET] Error:', error)
    const resp = NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
    return applyCookies(resp)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth
  const { id: missionId } = await params

  try {
    const { data: mission } = await ((supabase as any)
      .from('missions')
      .select('id, tc_id, status')
      .eq('id', missionId)
      .maybeSingle() as any)

    if (!mission) {
      const resp = NextResponse.json({ error: 'Mission introuvable' }, { status: 404 })
      return applyCookies(resp)
    }
    if (mission.tc_id !== userId) {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }
    if (mission.status === 'CANCELLED') {
      const resp = NextResponse.json(
        { error: 'Mission annulée : impossible de générer un lien d\u2019accès' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    // Corps optionnel (TTL et canal d'envoi) — POST peut être appelé sans corps.
    let ttlHours = MISSION_TOKEN_TTL_HOURS
    let channel: string = 'SMS'
    try {
      const body = await request.json()
      if (body?.expiresInHours !== undefined && body?.expiresInHours !== null) {
        const parsed = Number(body.expiresInHours)
        if (!Number.isFinite(parsed) || parsed < TTL_HOURS_MIN || parsed > TTL_HOURS_MAX) {
          const resp = NextResponse.json(
            { error: `expiresInHours doit être compris entre ${TTL_HOURS_MIN} et ${TTL_HOURS_MAX} heures` },
            { status: 400 }
          )
          return applyCookies(resp)
        }
        ttlHours = parsed
      }
      if (body?.channel !== undefined && body?.channel !== null) {
        if (!CHANNELS.includes(body.channel)) {
          const resp = NextResponse.json(
            { error: 'channel doit valoir SMS ou EMAIL' },
            { status: 400 }
          )
          return applyCookies(resp)
        }
        channel = body.channel
      }
    } catch {
      // Corps absent/non JSON : valeurs par défaut (SMS, 72 h)
    }

    // Relance (TC-006) : révocation des tokens encore actifs de la mission.
    const { data: previousActive } = await ((supabase as any)
      .from('mission_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('mission_id', missionId)
      .is('revoked_at', null)
      .select('id') as any)
    const revokedPrevious = (previousActive ?? []).length

    // Génération : le token clair n'existe qu'ici (jamais persisté).
    // Fail-closed : si le pepper est absent, generateMissionToken lève et la
    // route répond 503 sans créer de ligne.
    const { token, tokenHash, expiresAt } = generateMissionToken(ttlHours)

    const { data: created, error: insertError } = await ((supabase as any)
      .from('mission_access_tokens')
      .insert({
        mission_id: missionId,
        token_hash: tokenHash,
        channel,
        expires_at: expiresAt.toISOString(),
        created_by: userId,
      })
      .select('id, channel, expires_at, created_at')
      .single() as any)

    if (insertError || !created) {
      console.error('[TC Missions AccessLink POST] Insert error:', insertError)
      const resp = NextResponse.json(
        { error: 'Erreur interne du serveur' },
        { status: 500 }
      )
      return applyCookies(resp)
    }

    await ((supabase as any).from('audit_logs') as any).insert({
      user_id: userId,
      action: 'MISSION_TOKEN_SENT',
      entity: 'MissionAccessToken',
      entity_id: created.id,
      details: JSON.stringify({
        mission_id: missionId,
        channel,
        expires_at: created.expires_at,
        revoked_previous: revokedPrevious,
      }),
    })

    const resp = NextResponse.json(
      {
        id: created.id,
        // ⚠️ Token clair : retourné UNE SEULE fois au TC, jamais stocké.
        token,
        url: `/m/${token}`,
        channel: created.channel,
        expiresAt: created.expires_at,
        createdAt: created.created_at,
        revokedPrevious,
      },
      { status: 201 }
    )
    return applyCookies(resp)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('MISSION_TOKEN_PEPPER') || message.includes('OTP_HASH_PEPPER')) {
      console.error('[TC Missions AccessLink POST] Pepper manquant (fail-closed):', message)
      const resp = NextResponse.json(
        { error: 'Service indisponible : configuration du serveur incomplète' },
        { status: 503 }
      )
      return applyCookies(resp)
    }
    console.error('[TC Missions AccessLink POST] Error:', error)
    const resp = NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
    return applyCookies(resp)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth
  const { id: missionId } = await params

  try {
    const { data: mission } = await ((supabase as any)
      .from('missions')
      .select('id, tc_id')
      .eq('id', missionId)
      .maybeSingle() as any)

    if (!mission) {
      const resp = NextResponse.json({ error: 'Mission introuvable' }, { status: 404 })
      return applyCookies(resp)
    }
    if (mission.tc_id !== userId) {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    // tokenId optionnel (corps JSON ou query param) : sinon révocation de
    // tous les tokens actifs de la mission.
    let tokenId: string | null = null
    try {
      const body = await request.json()
      if (typeof body?.tokenId === 'string' && body.tokenId) tokenId = body.tokenId
    } catch {
      // pas de corps JSON
    }
    if (!tokenId) {
      tokenId = request.nextUrl.searchParams.get('tokenId')
    }

    let revokedRows: { id: string }[] = []
    if (tokenId) {
      const { data } = await ((supabase as any)
        .from('mission_access_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', tokenId)
        .eq('mission_id', missionId) // le token DOIT appartenir à cette mission
        .is('revoked_at', null)
        .select('id') as any)
      revokedRows = data ?? []
      if (revokedRows.length === 0) {
        const resp = NextResponse.json(
          { error: 'Aucun lien actif trouvé pour ce jeton sur cette mission' },
          { status: 404 }
        )
        return applyCookies(resp)
      }
    } else {
      const { data } = await ((supabase as any)
        .from('mission_access_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('mission_id', missionId)
        .is('revoked_at', null)
        .select('id') as any)
      revokedRows = data ?? []
    }

    await ((supabase as any).from('audit_logs') as any).insert({
      user_id: userId,
      action: 'MISSION_TOKEN_REVOKED',
      entity: 'MissionAccessToken',
      entity_id: revokedRows[0]?.id ?? null,
      details: JSON.stringify({
        mission_id: missionId,
        token_id: tokenId,
        revoked_count: revokedRows.length,
      }),
    })

    const resp = NextResponse.json({ revoked: revokedRows.length })
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Missions AccessLink DELETE] Error:', error)
    const resp = NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
    return applyCookies(resp)
  }
}
