import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notifyMany } from '@/lib/notify'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// GET /api/owner-file — List owner files for current owner with documents
export async function GET(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.userId

    const admin = getSupabaseAdminClient()

    const { data: user } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const role = user?.active_role || user?.role
    if (role !== 'PROPRIETAIRE' && role !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined

    let query = admin
      .from('owner_files')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: ownerFiles, error } = await query

    if (error) {
      console.error('Owner file GET error:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    const enriched = await enrichOwnerFiles(admin, ownerFiles ?? [])

    const statusCounts: Record<string, number> = {}
    for (const f of ownerFiles ?? []) {
      statusCounts[f.status] = (statusCounts[f.status] || 0) + 1
    }

    return NextResponse.json({
      data: enriched,
      stats: statusCounts,
    })
  } catch (error) {
    console.error('Owner file GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/owner-file — Create or update an owner file (upsert draft)
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.userId

    const admin = getSupabaseAdminClient()

    const { data: user } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const role = user?.active_role || user?.role
    if (role !== 'PROPRIETAIRE' && role !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { submit } = body as {
      submit?: boolean
    }

    const { data: existingDraft } = await admin
      .from('owner_files')
      .select('*')
      .eq('owner_id', userId)
      .eq('status', 'DRAFT')
      .maybeSingle()

    let ownerFile: any

    if (existingDraft) {
      const updateData: any = {}
      if (submit) updateData.status = 'SUBMITTED'

      const { data: updated } = await admin
        .from('owner_files')
        .update(updateData as any)
        .eq('id', existingDraft.id)
        .select()
        .single()

      ownerFile = updated

      await admin.from('audit_logs').insert({
        id: generateId(),
        action: submit ? 'SUBMIT' : 'UPDATE',
        entity: 'OwnerFile',
        entity_id: existingDraft.id,
        details: submit
          ? 'Dossier propriétaire soumis pour validation'
          : 'Dossier propriétaire (brouillon) mis à jour',
        user_id: userId,
      })
    } else if (submit) {
      // Resubmit from any non-validated status
      const { data: existingFile } = await admin
        .from('owner_files')
        .select('*')
        .eq('owner_id', userId)
        .not('status', 'eq', 'VALIDATED')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingFile) {
        const updateData: any = { status: 'SUBMITTED' }
        // Only clear rejection fields if it was rejected
        if (existingFile.status === 'REJECTED' || existingFile.status === 'EXPIRED') {
          updateData.rejection_reason = null
          updateData.tc_comment = null
          updateData.reviewed_by_id = null
          updateData.reviewed_at = null
        }

        const { data: updated } = await admin
          .from('owner_files')
          .update(updateData)
          .eq('id', existingFile.id)
          .select()
          .single()

        ownerFile = updated

        // Reset all documents to PENDING so the TC can review them again
        await admin
          .from('owner_file_documents')
          .update({ status: 'PENDING', tc_comment: null })
          .eq('owner_file_id', existingFile.id)

        await admin.from('audit_logs').insert({
          id: generateId(),
          action: 'SUBMIT',
          entity: 'OwnerFile',
          entity_id: existingFile.id,
          details: 'Dossier propriétaire soumis à nouveau pour validation',
          user_id: userId,
        })
      } else {
        const { data: created } = await admin
          .from('owner_files')
          .insert({
            id: generateId(),
            owner_id: userId,
            status: 'SUBMITTED',
          })
          .select()
          .single()

        ownerFile = created

        await admin.from('audit_logs').insert({
          id: generateId(),
          action: 'SUBMIT',
          entity: 'OwnerFile',
          entity_id: created?.id,
          details: 'Nouveau dossier propriétaire créé et soumis',
          user_id: userId,
        })
      }
    } else {
      // Vérifier d'abord si l'utilisateur a un fichier REJECTED à réutiliser
      const { data: rejectedFile } = await admin
        .from('owner_files')
        .select('*')
        .eq('owner_id', userId)
        .eq('status', 'REJECTED')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (rejectedFile) {
        // Réutiliser le fichier REJECTED : le repasser en DRAFT (conserve le même ID)
        const { data: updated } = await admin
          .from('owner_files')
          .update({
            status: 'DRAFT',
            rejection_reason: null,
            tc_comment: null,
            reviewed_by_id: null,
            reviewed_at: null,
          })
          .eq('id', rejectedFile.id)
          .select()
          .single()

        ownerFile = updated

        // Remettre les documents en PENDING pour re-examen
        await admin
          .from('owner_file_documents')
          .update({ status: 'PENDING', tc_comment: null })
          .eq('owner_file_id', rejectedFile.id)

        await admin.from('audit_logs').insert({
          id: generateId(),
          action: 'UPDATE',
          entity: 'OwnerFile',
          entity_id: rejectedFile.id,
          details: 'Dossier propriétaire (rejeté) rouvert en brouillon',
          user_id: userId,
        })
      } else {
        // Aucun fichier REJECTED — créer un nouveau DRAFT
        const { data: created } = await admin
          .from('owner_files')
          .insert({
            id: generateId(),
            owner_id: userId,
            status: 'DRAFT',
          })
          .select()
          .single()

        ownerFile = created

        await admin.from('audit_logs').insert({
          id: generateId(),
          action: 'CREATE',
          entity: 'OwnerFile',
          entity_id: created?.id,
          details: 'Nouveau dossier propriétaire (brouillon) créé',
          user_id: userId,
        })
      }
    }

    if (!ownerFile) {
      return NextResponse.json({ error: 'Erreur lors de la création/mise à jour' }, { status: 500 })
    }

    const enriched = await enrichOwnerFile(admin, ownerFile)

    // Notify TC when submitted
    if (submit) {
      try {
        const { data: tcUsers } = await admin
          .from('users')
          .select('id')
          .eq('role', 'TIERS_CONFIANCE')
          .eq('is_active', true)

        if (tcUsers && tcUsers.length > 0) {
          await notifyMany({
            userIds: tcUsers.map((tc: any) => tc.id),
            type: 'DOSSIER_UPDATE',
            title: 'Nouveau dossier propriétaire soumis',
            message: 'Un nouveau dossier propriétaire a été soumis et nécessite votre validation.',
            actionUrl: 'owner-dossiers',
            entityId: ownerFile.id,
          })
        }
      } catch (notifyErr) {
        console.error('Failed to notify TC about owner file submission:', notifyErr)
      }
    }

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Owner file POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function enrichOwnerFiles(admin: ReturnType<typeof getSupabaseAdminClient>, files: any[]) {
  const fileIds = files.map((f) => f.id)

  const { data: documents } = await admin
    .from('owner_file_documents')
    .select('*')
    .in('owner_file_id', fileIds)
    .order('created_at', { ascending: false })

  const reviewerIds = [...new Set(files.map((f) => f.reviewed_by_id).filter(Boolean))]
  const { data: reviewers } = reviewerIds.length > 0 ? await admin
    .from('users')
    .select('id, first_name, last_name')
    .in('id', reviewerIds) : { data: [] }

  const docMap = groupBy(documents ?? [], 'owner_file_id')
  const reviewerMap = new Map((reviewers ?? []).map((r) => [r.id, r]))

  return files.map((f) => ({
    id: f.id,
    status: f.status,
    monthlyIncome: f.monthly_income,
    employer: f.employer,
    employmentType: f.employment_type,
    guarantorName: f.guarantor_name,
    guarantorPhone: f.guarantor_phone,
    guarantorRelation: f.guarantor_relation,
    validUntil: f.valid_until,
    rejectionReason: f.rejection_reason,
    tcComment: f.tc_comment,
    reviewedAt: f.reviewed_at,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
    ownerId: f.owner_id,
    reviewedById: f.reviewed_by_id,
    documents: (docMap.get(f.id) ?? []).map(mapOwnerFileDoc),
    reviewedBy: (() => {
      const r = reviewerMap.get(f.reviewed_by_id)
      if (!r) return undefined
      return { id: r.id, firstName: r.first_name, lastName: r.last_name }
    })(),
  }))
}

async function enrichOwnerFile(admin: ReturnType<typeof getSupabaseAdminClient>, file: any) {
  const enriched = await enrichOwnerFiles(admin, [file])
  return enriched[0] ?? file
}

function mapOwnerFileDoc(d: any) {
  return {
    id: d.id,
    type: d.type,
    url: d.url,
    name: d.name,
    status: d.status,
    tcComment: d.tc_comment,
    createdAt: d.created_at,
    ownerFileId: d.owner_file_id,
  }
}

function groupBy(arr: any[], key: string) {
  const map = new Map<string, any[]>()
  for (const item of arr) {
    const k = item[key]
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return map
}
