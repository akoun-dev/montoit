import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { SIGNED_URL_EXPIRES_IN_SECONDS } from '@/lib/supabase/storage'

// ============================================================================
// TC-005 — Consultation des preuves d'une mission par le TC propriétaire.
//
// Les photos de mission sont stockées dans le bucket PRIVÉ `mission-evidence`
// (migration 20261027000060 — SEC-006 : zéro policy client, lecture possible
// UNIQUEMENT via URLs signées générées par le service_role). Cette route
// permet au Tiers de Confiance propriétaire de la mission de consulter les
// preuves remises par l'agent : chaque chemin de missions.photo_urls (texte
// JSON) est converti en URL signée de 1 heure.
//
// Contrat :
//   GET /api/tc/missions/[id]/evidence
//     → 200 { photos: [{ path, url }], feedback: string | null }
//     | 401 non authentifié
//     | 403 rôle non-TC ou TC non propriétaire de la mission
//     | 404 mission introuvable
//     | 500 (aucune URL signée n'a pu être créée alors que des preuves existent)
//
// Réservé au TC propriétaire (même pattern authorizeTC que
// src/app/api/tc/missions/[id]/access-link/route.ts) — le frontend TC
// consommera cette route plus tard (hors périmètre backend TC-005).
// ============================================================================

const EVIDENCE_BUCKET = 'mission-evidence'

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
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth
  const { id: missionId } = await params

  try {
    const { data: mission } = await ((supabase as any)
      .from('missions')
      .select('id, tc_id, photo_urls, feedback')
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

    // missions.photo_urls : texte contenant un tableau JSON de chemins
    // mission-evidence (missions/<mission_id>/<uuid>.<ext> — même convention
    // que POST /api/missions-token/[token] et PATCH /api/tc/missions).
    let paths: string[] = []
    try {
      const parsed = JSON.parse(mission.photo_urls || '[]')
      if (Array.isArray(parsed)) {
        paths = parsed
          .filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0)
          .map((p: string) => p.trim())
      }
    } catch {
      paths = []
    }

    // URLs SIGNÉES 1 h (SIGNED_URL_EXPIRES_IN_SECONDS = 3600 — pattern
    // signDocUrls de src/lib/supabase/storage.ts). Signatures parallèles :
    // une pièce illisible (chemin orphelin, objet supprimé) ne prive pas le
    // TC des autres preuves.
    const settled = await Promise.allSettled(
      paths.map(async (path) => {
        const { data, error } = await ((supabase as any)
          .storage
          .from(EVIDENCE_BUCKET)
          .createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS) as any)
        if (error || !data?.signedUrl) {
          throw error ?? new Error('URL signée manquante')
        }
        return { path, url: data.signedUrl as string }
      })
    )

    const photos: Array<{ path: string; url: string }> = []
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i]
      if (result.status === 'fulfilled') {
        photos.push(result.value)
      } else {
        console.error(
          '[TC Missions Evidence GET] Signature échouée pour',
          paths[i],
          ':',
          result.reason
        )
      }
    }

    // Des preuves existent mais AUCUNE n'a pu être signée : problème
    // serveur/bucket → 500 (le TC peut réessayer).
    if (paths.length > 0 && photos.length === 0) {
      const resp = NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
      return applyCookies(resp)
    }

    const resp = NextResponse.json({
      photos,
      feedback: mission.feedback ?? null,
    })
    resp.headers.set('Cache-Control', 'no-store')
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Missions Evidence GET] Error:', error)
    const resp = NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
    return applyCookies(resp)
  }
}
