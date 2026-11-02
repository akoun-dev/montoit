import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limiter'
import {
  missionTokenIpKey,
  resolveMissionToken,
  type MissionTokenRecordRow,
} from '@/lib/mission-token-guard'
import { sendEmail, sendSms } from '@/lib/ansut-messaging'

// ============================================================================
// TC-003 — Route publique de collecte de mission (spec TC-001, Option C).
// Acteur : AGENT_TERRAIN (SANS compte) — identifié par le seul token du path.
// AUCUNE dépendance au middleware ni au code dashboard : /api/missions-token/*
// est volontairement hors PROTECTED_API_PREFIXES (TC-001 §7 — ne pas « corriger »).
//
// GET  : fiche mission BORNÉE pour l'agent (checklist selon le type de mission,
//        nom du TC, expiration, état de soumission). AUCUNE PII inutile :
//        pas d'email/téléphone du TC, pas de données des autres missions.
// POST : actions 'start' (première ouverture → IN_PROGRESS, idempotent) et
//        'submit' (photos obligatoires ≥ 1 + notes → COMPLETED, 409 si déjà
//        rendu, photos verrouillées au dossier mission-evidence de LA mission).
//
// Cycle de vie single-use par étage (open ≠ submit) : opened_at / submitted_at
// dans mission_access_tokens ; statuts missions ASSIGNED → IN_PROGRESS →
// COMPLETED ; CANCELLED bloque start/submit.
//
// Audit (pattern quittance, non bloquant) : MISSION_TOKEN_OPENED /
// MISSION_TOKEN_SUBMITTED avec mission_id. audit_logs.user_id étant NOT NULL
// (FK users), l'entrée est portée par le TC responsable (mission.tc_id) et
// l'attribution agent porte dans details.actor = 'agent:<verification_agents.id>'
// (spec TC-001 §5.3 — chaîne de responsabilité : le TC a créé et envoyé la mission).
//
// TC-005 (spec TC-001 §8) — à la soumission :
//   1. Notification du TC propriétaire (SMS ≤ 160 car., à défaut email) en
//      FIRE-AND-FORGET : jamais bloquante pour la réponse 200 à l'agent,
//      échecs loggés, jamais de throw (pattern notifyAgentOfMission).
//   2. Missions de type INVENTORY_REPORT : création d'un DRAFT
//      inventory_reports (reviewer = TC, property de la mission) rattaché à
//      la mission via missions.inventory_report_id (UNIQUE → idempotent).
//      L'échec du draft NE fait JAMAIS échouer la soumission de l'agent.
//   3. Audit enrichi : details.notification ('sms'|'email'|'none') et
//      details.inventory_draft ('created'|'skipped_existing'|'failed').
// ============================================================================

const RATE_LIMIT_GET = { maxRequests: 20, windowMs: 60_000 } // fiche : rechargements mobile
const RATE_LIMIT_POST = { maxRequests: 10, windowMs: 60_000 } // spec TC-001 §9 : anti brute-force
const STORE_GET = 'missions-token-get'
const STORE_POST = 'missions-token-post'

const MAX_NOTES_LENGTH = 5000
const MAX_PHOTOS = 20
const MAX_PHOTO_PATH_LENGTH = 512

/** Checklist de terrain selon le type de mission (libellés français simples). */
const MISSION_CHECKLISTS: Record<string, Array<{ id: string; label: string }>> = {
  PROPERTY_VERIFICATION: [
    { id: 'localisation', label: 'Confirmer la localisation du bien (adresse, quartier)' },
    { id: 'occupation', label: "État d'occupation du bien (libre / occupé)" },
    { id: 'conformite', label: "Conformité avec l'annonce (type, nombre de pièces)" },
    { id: 'etat_general', label: 'État général (murs, toiture, plomberie, électricité, eau)' },
    { id: 'documents', label: 'Documents disponibles (titre foncier, plan, quittances)' },
    { id: 'photos', label: 'Photos extérieur + intérieur (au moins 1)' },
  ],
  // Aligné sur la grille inventory_report_items (pièces × BON/MAUVAIS, clés,
  // observations — spec TC-001 SC-2). Le rapport reste créé/validé par le TC.
  INVENTORY_REPORT: [
    { id: 'entree', label: 'Entrée — BON / MAUVAIS + observations' },
    { id: 'salon', label: 'Salon — BON / MAUVAIS + observations' },
    { id: 'cuisine', label: 'Cuisine — BON / MAUVAIS + observations' },
    { id: 'salle_de_bain_principale', label: 'Salle de bain principale — BON / MAUVAIS + observations' },
    { id: 'autre_salle_de_bain', label: 'Autre salle de bain — BON / MAUVAIS + observations' },
    { id: 'chambres', label: 'Chambres et autres pièces — BON / MAUVAIS + observations' },
    { id: 'cles', label: 'Clés remises (nombre et type)' },
    { id: 'compteurs', label: 'Relevés compteurs (eau / électricité)' },
    { id: 'photos', label: 'Photos de chaque pièce (au moins 1)' },
  ],
}

interface MissionFiche {
  id: string
  type: string
  status: string
  notes: string | null
  scheduled_at: string
  feedback: string | null
  photo_urls: string
  property_id: string
  agent_id: string
  tc_id: string
  inventory_report_id: string | null
  property: {
    title: string
    address: string
    commune: string | null
    city: string
  } | null
  tc: {
    first_name: string
    last_name: string
    // TC-005 : coordonnées chargées pour la notification de soumission.
    // Usage STRICTEMENT serveur — JAMAIS sérialisées dans la réponse de la
    // fiche agent (le GET n'expose que tc.name = prénom + nom).
    email: string | null
    phone: string | null
  } | null
}

/** Fiche mission + jointures bornées (property title/zone, nom du TC). */
async function loadMissionFiche(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  missionId: string
): Promise<MissionFiche | null> {
  const { data: mission } = await ((supabase as any)
    .from('missions')
    .select(
      'id, type, status, notes, scheduled_at, feedback, photo_urls, property_id, agent_id, tc_id, inventory_report_id'
    )
    .eq('id', missionId)
    .maybeSingle() as any)
  if (!mission) return null

  const [{ data: property }, { data: tc }] = await Promise.all([
    (supabase as any)
      .from('properties')
      .select('title, address, commune, city')
      .eq('id', mission.property_id)
      .maybeSingle(),
    (supabase as any)
      .from('users')
      .select('first_name, last_name, email, phone')
      .eq('id', mission.tc_id)
      .maybeSingle(),
  ])

  return {
    ...(mission as Omit<MissionFiche, 'property' | 'tc'>),
    property: property ?? null,
    tc: tc ?? null,
  }
}

/** Zone lisible : adresse + commune (ou ville) — c'est ce que l'agent doit trouver. */
function composeZone(property: MissionFiche['property']): string {
  if (!property) return 'Adresse non précisée'
  const parts = [property.address, property.commune || property.city]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Adresse non précisée'
}

// ────────────────────────────────────────────────────────────────────────────
// TC-005 M1 — Notification du TC à la soumission
// ────────────────────────────────────────────────────────────────────────────

/**
 * Message SMS TC, garanti ≤ 160 caractères (contrainte opérateur) :
 * « Mon Toit : l'agent a rendu le rapport de mission « <titre> » (zone).
 *   Consultez-le dans votre espace Tiers de Confiance. »
 * Titre puis zone tronqués pour tenir dans le budget (108 car. fixes).
 */
function composeTcSms(missionTitle: string, zone: string): string {
  const prefix = "Mon Toit : l'agent a rendu le rapport de mission « "
  const middle = " » ("
  const suffix = "). Consultez-le dans votre espace Tiers de Confiance."
  const budget = 160 - prefix.length - middle.length - suffix.length // 52
  const title = missionTitle.trim().slice(0, 32)
  const zoneBudget = Math.max(0, budget - title.length)
  const zoneText = zone.trim().slice(0, zoneBudget) || 'zone non précisée'
  return `${prefix}${title}${middle}${zoneText}${suffix}`.slice(0, 160)
}

/**
 * Notification du TC propriétaire — FIRE-AND-FORGET (appelée via void, jamais
 * attendue) : sendSms/sendEmail gèrent déjà leurs erreurs en interne ; tout
 * rejet résiduel est loggé ici, JAMAIS propagé. La réponse 200 à l'agent
 * n'attend jamais ANSUT (pattern dominant : envoi après succès métier).
 * Canal unique prioritaire : SMS (le TC reçoit déjà ses tokens par SMS) ;
 * à défaut (pas de téléphone), email.
 */
async function notifyTcOfSubmission(fiche: MissionFiche): Promise<void> {
  const title = fiche.property?.title?.trim() || 'mission'
  const zone = composeZone(fiche.property)
  const text = composeTcSms(title, zone)

  const tasks: Promise<unknown>[] = []
  if (fiche.tc?.phone) {
    tasks.push(sendSms({ to: fiche.tc.phone, text }))
  } else if (fiche.tc?.email) {
    tasks.push(
      sendEmail({
        to: fiche.tc.email,
        subject: 'Mon Toit - Rapport de mission disponible',
        content: `<p>${text}</p>`,
        isHtml: true,
      })
    )
  }

  if (tasks.length === 0) {
    console.warn('[missions-token] TC sans coordonnées : notification non envoyée')
    return
  }
  const settled = await Promise.allSettled(tasks)
  for (const result of settled) {
    if (result.status === 'rejected') {
      console.error('[missions-token] Échec notification TC (non bloquant):', result.reason)
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TC-005 M2 — Draft inventory_reports pour les missions INVENTORY_REPORT
// ────────────────────────────────────────────────────────────────────────────

/** Résultat de la création du draft d'état des lieux (audit + réponse). */
type InventoryDraftOutcome =
  | { status: 'created'; reportId: string }
  | { status: 'skipped_existing'; reportId: string }
  | { status: 'failed' }

/**
 * Crée le draft d'état des lieux lié à la propriété de la mission.
 *
 * Schéma réel (migration 20260518131926_create_inventory_reports) :
 *   id text PK (généré ici), type INVENTORY_ENTRANCE|INVENTORY_EXIT,
 *   status DRAFT par défaut, property_id NOT NULL, reviewer_id NOT NULL (→
 *   users), lease_id NULLABLE (→ leases), general_observations text.
 * Mapping retenu :
 *   - reviewer_id = mission.tc_id (le TC est le rédacteur/validateur) ;
 *   - lease_id = null : la table N'EXIGE PAS de lease (colonne nullable) et
 *     la mission n'est pas liée à un bail — le TC rattache le lease à sa
 *     validation dans son écran existant (aucun écart de schéma) ;
 *   - general_observations = feedback de l'agent ;
 *   - la table n'a AUCUNE colonne photos : les preuves restent dans
 *     missions.photo_urls, rattachées au rapport via
 *     missions.inventory_report_id (consultation : GET /api/tc/missions/[id]/evidence).
 *
 * Idempotence : missions.inventory_report_id est UNIQUE — si un rapport est
 * déjà rattaché (rejeu extrême), on ne duplique pas ('skipped_existing').
 */
async function createInventoryReportDraft(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  fiche: MissionFiche,
  agentFeedback: string | null
): Promise<InventoryDraftOutcome> {
  if (fiche.inventory_report_id) {
    return { status: 'skipped_existing', reportId: fiche.inventory_report_id }
  }

  const reportId = crypto.randomUUID()
  const { error: insertError } = await ((supabase as any)
    .from('inventory_reports')
    .insert({
      id: reportId,
      // mission_type ne distingue pas entrée/sortie : défaut métier = état
      // des lieux d'ENTRÉE (cas nominal d'un constat de mission) ; le TC
      // peut rectifier le type lors de la validation du draft.
      type: 'INVENTORY_ENTRANCE',
      status: 'DRAFT',
      property_id: fiche.property_id,
      reviewer_id: fiche.tc_id,
      lease_id: null,
      general_observations: agentFeedback,
      completed_at: null,
    }) as any)

  if (insertError) {
    console.error('[missions-token] Erreur création draft inventory_reports:', insertError)
    return { status: 'failed' }
  }

  // Rattachement à la mission : rend le draft visible dans la file TC
  // (GET /api/tc/missions joint déjà inventory_reports via ce champ).
  // Garde anti-course is('inventory_report_id', null) : jamais d'écrasement.
  const { error: linkError } = await ((supabase as any)
    .from('missions')
    .update({ inventory_report_id: reportId })
    .eq('id', fiche.id)
    .is('inventory_report_id', null) as any)
  if (linkError) {
    // Le draft existe : simple dégradation (rattachement à refaire) — la
    // soumission de l'agent reste un succès.
    console.error('[missions-token] Erreur rattachement inventory_report_id:', linkError)
  }
  return { status: 'created', reportId }
}

function rateLimitOr429(
  request: NextRequest,
  storeName: string,
  options: { maxRequests: number; windowMs: number }
): NextResponse | null {
  const ip = missionTokenIpKey(request)
  const { allowed } = checkRateLimit(storeName, ip, options)
  if (!allowed) {
    const response = NextResponse.json(
      { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
      { status: 429 }
    )
    response.headers.set('Retry-After', String(Math.ceil(options.windowMs / 1000)))
    response.headers.set('X-RateLimit-Remaining', '0')
    return response
  }
  return null
}

/** Audit non bloquant (pattern quittance — src/app/api/payments/[id]/quittance). */
async function writeAudit(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  entry: {
    action: 'MISSION_TOKEN_OPENED' | 'MISSION_TOKEN_SUBMITTED'
    tokenId: string
    tcId: string
    missionId: string
    agentId: string
    details: Record<string, unknown>
  }
): Promise<void> {
  try {
    await ((supabase as any).from('audit_logs') as any).insert({
      id: crypto.randomUUID(),
      action: entry.action,
      entity: entry.action === 'MISSION_TOKEN_OPENED' ? 'MissionAccessToken' : 'Mission',
      entity_id: entry.action === 'MISSION_TOKEN_OPENED' ? entry.tokenId : entry.missionId,
      details: JSON.stringify({
        mission_id: entry.missionId,
        actor: `agent:${entry.agentId}`,
        ...entry.details,
      }),
      user_id: entry.tcId,
    })
  } catch (auditError) {
    console.error('[missions-token] Erreur audit_logs (non bloquant):', auditError)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET — fiche mission bornée pour la page mobile de l'agent (/m/[token])
// ────────────────────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = rateLimitOr429(request, STORE_GET, RATE_LIMIT_GET)
  if (limited) return limited

  const { token } = await params
  const resolved = await resolveMissionToken(token)
  if (!resolved.ok) return resolved.response

  const supabase = getSupabaseAdminClient()
  const record: MissionTokenRecordRow = resolved.record

  const fiche = await loadMissionFiche(supabase, record.mission_id)
  if (!fiche) {
    // Mission supprimée (cascade tokens) : même sémantique que NOT_FOUND.
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  const alreadySubmitted =
    record.submitted_at !== null || fiche.status === 'COMPLETED'

  const response = NextResponse.json({
    mission: {
      id: fiche.id,
      title: fiche.property?.title ?? '',
      type: fiche.type,
      zone: composeZone(fiche.property),
      scheduled_at: fiche.scheduled_at,
      notes: fiche.notes,
      status: fiche.status,
    },
    tc: {
      name: [fiche.tc?.first_name, fiche.tc?.last_name]
        .map((p) => (p ?? '').trim())
        .filter(Boolean)
        .join(' '),
    },
    checklist: MISSION_CHECKLISTS[fiche.type] ?? [],
    expires_at: record.expires_at,
    already_submitted: alreadySubmitted,
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}

// ────────────────────────────────────────────────────────────────────────────
// POST — actions de l'agent : {action:'start'} | {action:'submit',photos,notes}
// ────────────────────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = rateLimitOr429(request, STORE_POST, RATE_LIMIT_POST)
  if (limited) return limited

  const { token } = await params
  const resolved = await resolveMissionToken(token)
  if (!resolved.ok) return resolved.response

  const supabase = getSupabaseAdminClient()
  const record: MissionTokenRecordRow = resolved.record

  // Corps strict : JSON uniquement, action connue, champs typés et bornés.
  let body: {
    action?: unknown
    photos?: unknown
    notes?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }

  const action = body?.action
  if (action !== 'start' && action !== 'submit') {
    return NextResponse.json(
      { error: "action doit valoir 'start' ou 'submit'" },
      { status: 400 }
    )
  }

  const fiche = await loadMissionFiche(supabase, record.mission_id)
  if (!fiche) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  if (fiche.status === 'CANCELLED') {
    return NextResponse.json(
      { error: 'MISSION_CANCELLED' },
      { status: 409 }
    )
  }

  if (action === 'start') {
    return handleStart(request, supabase, record, fiche)
  }
  return handleSubmit(supabase, record, fiche, body)
}

// ── start : première ouverture → opened_at + mission IN_PROGRESS (idempotent)
async function handleStart(
  request: NextRequest,
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  record: MissionTokenRecordRow,
  fiche: MissionFiche
): Promise<NextResponse> {
  // Déjà ouvert par un appel précédent : idempotent (double-tap réseau mobile).
  if (record.opened_at) {
    return NextResponse.json({ ok: true, mission_status: fiche.status })
  }

  const nowIso = new Date().toISOString()
  const userAgent = (request.headers.get('user-agent') ?? '').slice(0, 512)

  // Course concurrentielle arbitré par la condition opened_at IS NULL :
  // un seul appel effectue réellement l'ouverture, les autres retombent en 200.
  const { data: openedRows } = await ((supabase as any)
    .from('mission_access_tokens')
    .update({ opened_at: nowIso, user_agent: userAgent })
    .eq('id', record.id)
    .is('opened_at', null)
    .select('id') as any)

  if (!openedRows || openedRows.length === 0) {
    // Un appel concurrent a déjà ouvert : réponse idempotente.
    return NextResponse.json({ ok: true, mission_status: fiche.status })
  }

  let missionStatus = fiche.status
  if (fiche.status === 'ASSIGNED') {
    const { data: updated } = await ((supabase as any)
      .from('missions')
      .update({ status: 'IN_PROGRESS' })
      .eq('id', fiche.id)
      .in('status', ['ASSIGNED'])
      .select('status')
      .single() as any)
    missionStatus = updated?.status ?? fiche.status
  }

  await writeAudit(supabase, {
    action: 'MISSION_TOKEN_OPENED',
    tokenId: record.id,
    tcId: fiche.tc_id,
    missionId: fiche.id,
    agentId: fiche.agent_id,
    details: { channel: record.channel },
  })

  return NextResponse.json({ ok: true, mission_status: missionStatus })
}

// ── submit : photos (≥ 1, dossier de LA mission) + notes → COMPLETED
async function handleSubmit(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  record: MissionTokenRecordRow,
  fiche: MissionFiche,
  body: { photos?: unknown; notes?: unknown }
): Promise<NextResponse> {
  // Déjà rendu (double-tap ou rejeu) : 409 — la page mobile affiche l'état
  // « déjà rendu » (idempotence métier : aucun doublon photo/rapport écrit).
  if (record.submitted_at || fiche.status === 'COMPLETED') {
    return NextResponse.json({ error: 'ALREADY_SUBMITTED' }, { status: 409 })
  }

  // Photos obligatoires (≥ 1 — critère d'acceptation TC-004 / spec TC-001).
  const photos = body?.photos
  if (!Array.isArray(photos) || photos.length === 0) {
    return NextResponse.json(
      { error: 'Au moins une photo est requise pour rendre compte' },
      { status: 400 }
    )
  }
  if (photos.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Au maximum ${MAX_PHOTOS} photos par soumission` },
      { status: 400 }
    )
  }

  const folderPrefix = `missions/${fiche.id}/`
  for (const photo of photos) {
    if (
      typeof photo !== 'string' ||
      photo.length === 0 ||
      photo.length > MAX_PHOTO_PATH_LENGTH ||
      !photo.startsWith(folderPrefix) ||
      !/^missions\/[^/]+\/[A-Za-z0-9._-]+$/.test(photo)
    ) {
      // Un token ne peut référencer que les preuves de SA mission
      // (vérif serveur par jointure — checklist QA TC-001 §9).
      return NextResponse.json({ error: 'Chemin de photo invalide' }, { status: 400 })
    }
  }
  const uniquePhotos = [...new Set(photos as string[])]

  let notes: string | null = null
  if (body?.notes !== undefined && body?.notes !== null) {
    if (typeof body.notes !== 'string') {
      return NextResponse.json({ error: 'notes doit être une chaîne de caractères' }, { status: 400 })
    }
    notes = body.notes.trim().slice(0, MAX_NOTES_LENGTH) || null
  }

  // Verrou single-use : un seul appel passe la condition submitted_at IS NULL.
  const nowIso = new Date().toISOString()
  const { data: submittedRows } = await ((supabase as any)
    .from('mission_access_tokens')
    .update({ submitted_at: nowIso })
    .eq('id', record.id)
    .is('submitted_at', null)
    .select('id') as any)

  if (!submittedRows || submittedRows.length === 0) {
    return NextResponse.json({ error: 'ALREADY_SUBMITTED' }, { status: 409 })
  }

  // Fusion sans doublon des preuves dans missions.photo_urls (colonne texte
  // contenant un tableau JSON — même convention que PATCH /api/tc/missions).
  let existingPhotos: string[] = []
  try {
    const parsed = JSON.parse(fiche.photo_urls || '[]')
    if (Array.isArray(parsed)) existingPhotos = parsed.filter((u) => typeof u === 'string')
  } catch {
    existingPhotos = []
  }
  const mergedPhotos = [...existingPhotos, ...uniquePhotos.filter((p) => !existingPhotos.includes(p))]

  // Champs réels de la table missions : photo_urls (preuves) et feedback
  // (constat de l'agent — mission.notes reste les consignes du TC).
  const { error: missionUpdateError } = await ((supabase as any)
    .from('missions')
    .update({
      status: 'COMPLETED',
      completed_at: nowIso,
      photo_urls: JSON.stringify(mergedPhotos),
      feedback: notes,
    })
    .eq('id', fiche.id) as any)

  if (missionUpdateError) {
    // Rollback du verrou token : l'agent doit pouvoir re-tenter sa soumission.
    await ((supabase as any)
      .from('mission_access_tokens')
      .update({ submitted_at: null })
      .eq('id', record.id) as any)
    console.error('[missions-token] Erreur mise à jour mission:', missionUpdateError)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }

  // ── TC-005 M1 : notification du TC propriétaire (fire-and-forget).
  // Le canal est décidé ici (coordonnées déjà chargées par la fiche) pour
  // l'audit ; l'envoi réel part en tâche de fond, JAMAIS attendu.
  const notificationChannel: 'sms' | 'email' | 'none' =
    fiche.tc?.phone ? 'sms' : fiche.tc?.email ? 'email' : 'none'
  void notifyTcOfSubmission(fiche).catch((notifyError: unknown) => {
    console.error('[missions-token] Notification TC échouée (non bloquant):', notifyError)
  })

  // ── TC-005 M2 : draft inventory_reports (missions INVENTORY_REPORT).
  // Isolé en try/catch : un problème de draft ne doit JAMAIS faire perdre le
  // travail de l'agent — la soumission reste un succès (200).
  let inventoryDraft: InventoryDraftOutcome | null = null
  if (fiche.type === 'INVENTORY_REPORT') {
    try {
      inventoryDraft = await createInventoryReportDraft(supabase, fiche, notes)
    } catch (draftError) {
      console.error('[missions-token] Erreur inattendue draft inventory_reports:', draftError)
      inventoryDraft = { status: 'failed' }
    }
  }

  await writeAudit(supabase, {
    action: 'MISSION_TOKEN_SUBMITTED',
    tokenId: record.id,
    tcId: fiche.tc_id,
    missionId: fiche.id,
    agentId: fiche.agent_id,
    details: {
      photos_count: uniquePhotos.length,
      has_notes: notes !== null,
      submitted_at: nowIso,
      notification: notificationChannel,
      ...(inventoryDraft
        ? {
            inventory_draft: inventoryDraft.status,
            inventory_report_id:
              'reportId' in inventoryDraft ? inventoryDraft.reportId : null,
          }
        : {}),
    },
  })

  return NextResponse.json({
    ok: true,
    mission_status: 'COMPLETED',
    // Contrat TC-005 : présent uniquement pour les missions d'état des lieux.
    ...(fiche.type === 'INVENTORY_REPORT'
      ? { inventory_report_created: inventoryDraft?.status === 'created' }
      : {}),
  })
}
