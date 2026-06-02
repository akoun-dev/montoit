import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await ((supabase as any)
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single() as any)
    const effectiveRole = profile?.active_role || profile?.role

    if (effectiveRole !== 'TIERS_CONFIANCE' && effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE ou ADMIN requis' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const priority = searchParams.get('priority')
    const onHold = searchParams.get('onHold')
    const overdue = searchParams.get('overdue') === 'true'
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50
    const offset = offsetParam ? parseInt(offsetParam) : 0

    let query = supabase
      .from('rental_files')
      .select('*', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    } else if (!overdue) {
      query = query.in('status', ['SUBMITTED', 'TC_REVIEW'])
    }

    if (search) {
      const { data: matchingTenants } = await ((supabase as any)
        .from('users')
        .select('id')
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`))
      const tenantIds = (matchingTenants ?? []).map((t: any) => t.id)
      if (tenantIds.length > 0) {
        query = query.in('tenant_id', tenantIds)
      } else {
        query = query.eq('tenant_id', '__nonexistent__')
      }
    }

    if (priority) query = query.eq('priority', priority)
    if (onHold === 'true') query = query.eq('on_hold', true)
    else if (onHold === 'false') query = query.eq('on_hold', false)

    if (overdue) {
      const { data: overdueSlas } = await ((supabase as any)
        .from('validation_slas')
        .select('entity_id')
        .eq('entity_type', 'RENTAL_FILE')
        .eq('is_overdue', true)
        .is('completed_at', null))
      const overdueIds = (overdueSlas ?? []).map((s: any) => s.entity_id)
      if (overdueIds.length > 0) {
        query = query.in('id', overdueIds)
      } else {
        query = query.eq('id', '__nonexistent__')
      }
    }

    query = query
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: filesData, count: total } = await (query as any)
    const filesRaw = (filesData ?? []) as any[]

    const tenantIds = [...new Set(filesRaw.map((f: any) => f.tenant_id).filter(Boolean))]
    const fileIds = filesRaw.map((f: any) => f.id)

    // Fallback : récupère aussi les DRAFT des mêmes locataires pour leurs documents
    let draftFileIds: string[] = []
    if (tenantIds.length > 0) {
      const { data: draftFiles } = await (supabase.from('rental_files') as any)
        .select('id')
        .eq('status', 'DRAFT')
        .in('tenant_id', tenantIds)
      draftFileIds = (draftFiles ?? []).map((d: any) => d.id)
    }

    const allFileIds = [...new Set([...fileIds, ...draftFileIds])]

    const [{ data: tenantsData }, { data: documentsData }, { data: slasData }] = await Promise.all([
      tenantIds.length > 0
        ? (supabase.from('users') as any).select('id, first_name, last_name, phone, email, avatar_url').in('id', tenantIds) as any
        : Promise.resolve({ data: [] as any[], error: null }),
      allFileIds.length > 0
        ? (supabase.from('rental_file_documents') as any).select('*').in('rental_file_id', allFileIds).order('created_at', { ascending: true }) as any
        : Promise.resolve({ data: [] as any[], error: null }),
      fileIds.length > 0
        ? (supabase.from('validation_slas') as any).select('*').eq('entity_type', 'RENTAL_FILE').in('entity_id', fileIds).eq('is_overdue', true).is('completed_at', null) as any
        : Promise.resolve({ data: [] as any[], error: null }),
    ])

    const tenantMap = new Map<string, any>((tenantsData ?? []).map((t: any) => [t.id, t]))
    const docByFile = new Map<string, any[]>()
    for (const doc of (documentsData ?? []) as any[]) {
      if (!docByFile.has(doc.rental_file_id)) docByFile.set(doc.rental_file_id, [])
      docByFile.get(doc.rental_file_id)!.push(doc)
    }

    // Build tenantId → draftFileId map for document fallback
    const draftFileByTenant = new Map<string, string>()
    for (const f of filesRaw) {
      if (f.status === 'DRAFT') {
        draftFileByTenant.set(f.tenant_id, f.id)
      }
    }

    const slaMap = new Map<string, any>((slasData ?? []).map((s: any) => [s.entity_id, s]))

    const filesWithSla = filesRaw.map((f: any) => {
      const tenant = tenantMap.get(f.tenant_id)
      // Fallback : si le fichier n'a pas de documents, prend ceux du DRAFT du même locataire
      const fileDocs = docByFile.get(f.id)
      const fallbackDraftId = !fileDocs?.length ? draftFileByTenant.get(f.tenant_id) : undefined
      const documents = ((fileDocs?.length ? fileDocs : (fallbackDraftId ? docByFile.get(fallbackDraftId) : [])) ?? []).map((d: any) => ({
        id: d.id,
        rentalFileId: f.id,
        type: d.type,
        name: d.name,
        url: d.url,
        status: d.status,
        tcComment: d.tc_comment,
        createdAt: d.created_at,
      }))
      const sla = slaMap.get(f.id)

      return {
        id: f.id,
        tenantId: f.tenant_id,
        status: f.status,
        priority: f.priority,
        tenantCategory: f.tenant_category,
        rentalStatus: f.rental_status,
        tcComment: f.tc_comment,
        rejectionReason: f.rejection_reason,
        reviewedById: f.reviewed_by_id,
        reviewedAt: f.reviewed_at,
        onHold: f.on_hold,
        onHoldReason: f.on_hold_reason,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
        tenant: tenant ? {
          id: tenant.id,
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          phone: tenant.phone,
          email: tenant.email,
          avatarUrl: tenant.avatar_url,
        } : null,
        documents,
        sla: sla ? {
          id: sla.id,
          entityId: sla.entity_id,
          submittedAt: sla.submitted_at,
          deadlineAt: sla.deadline_at,
          isOverdue: sla.is_overdue,
        } : null,
      }
    })

    const resp = NextResponse.json({
      files: filesWithSla,
      pagination: {
        total: total ?? 0,
        limit,
        offset,
        hasMore: offset + limit < (total ?? 0),
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC rental files GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await ((supabase as any)
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single() as any)
    const effectiveRole = profile?.active_role || profile?.role

    if (effectiveRole !== 'TIERS_CONFIANCE' && effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE ou ADMIN requis' }, { status: 403 })
    }

    const body = await req.json()
    const { fileIds, action, comment, documentUpdates, priority, onHold, onHoldReason, id } = body

    // ─── Single file update: priority / onHold ──────────────────────────
    if (id && !fileIds) {
      const { data: file } = await ((supabase as any)
        .from('rental_files')
        .select('*')
        .eq('id', id)
        .single() as any)
      if (!file) {
        return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
      }

      const updateData: Record<string, unknown> = {}

      if (priority !== undefined) {
        if (!['NORMAL', 'HIGH', 'URGENT'].includes(priority)) {
          return NextResponse.json({ error: 'Priorité invalide' }, { status: 400 })
        }
        updateData.priority = priority
      }

      if (onHold !== undefined) {
        updateData.on_hold = Boolean(onHold)
        if (onHold) {
          updateData.on_hold_reason = onHoldReason?.trim() || null
        } else {
          updateData.on_hold_reason = null
        }
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
      }

      const { data: updated } = await ((supabase as any)
        .from('rental_files')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single() as any)

      await (supabase.from('audit_logs') as any).insert({
        action: priority ? 'RENTAL_FILE_PRIORITY_CHANGED' : onHold ? 'RENTAL_FILE_PUT_ON_HOLD' : 'RENTAL_FILE_RESUMED',
        entity: 'RentalFile',
        entity_id: id,
        details: JSON.stringify({ priority, onHold, onHoldReason }),
        user_id: userId,
      })

      const resp = NextResponse.json({ success: true, file: updated })
      return applyCookies(resp)
    }

    // ─── Batch action: APPROVE / REJECT / REQUEST_INFO ──────────────────
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'fileIds est requis (tableau non vide)' }, { status: 400 })
    }
    if (!action || !['APPROVE', 'REJECT', 'REQUEST_INFO'].includes(action)) {
      return NextResponse.json({ error: 'action doit être APPROVE, REJECT ou REQUEST_INFO' }, { status: 400 })
    }

    const results: any[] = []

    for (const fileId of fileIds) {
      const { data: file } = await ((supabase as any)
        .from('rental_files')
        .select('*, tenant:users!tenant_id(*)')
        .eq('id', fileId)
        .single() as any)

      if (!file) {
        results.push({ fileId, success: false, error: 'Dossier introuvable' })
        continue
      }

      if (file.status !== 'SUBMITTED' && file.status !== 'TC_REVIEW') {
        results.push({ fileId, success: false, error: 'Ce dossier n\'est pas en attente de vérification' })
        continue
      }

      let newStatus: string
      let auditAction: string
      let notificationTitle: string

      if (action === 'APPROVE') {
        newStatus = 'VALIDATED'
        auditAction = 'RENTAL_FILE_APPROVED'
        notificationTitle = 'Dossier validé'
      } else if (action === 'REJECT') {
        newStatus = 'REJECTED'
        auditAction = 'RENTAL_FILE_REJECTED'
        notificationTitle = 'Dossier rejeté'
      } else {
        newStatus = 'TC_REVIEW'
        auditAction = 'RENTAL_FILE_INFO_REQUESTED'
        notificationTitle = 'Documents complémentaires requis'
      }

      if (documentUpdates && Array.isArray(documentUpdates)) {
        for (const docUpdate of documentUpdates) {
          if (docUpdate.documentId && docUpdate.status) {
            await (supabase as any)
              .from('rental_file_documents')
              .update({
                status: docUpdate.status,
                tc_comment: docUpdate.comment || null,
              })
              .eq('id', docUpdate.documentId)
          }
        }
      }

      const { data: updatedFile } = await ((supabase as any)
        .from('rental_files')
        .update({
          status: newStatus,
          reviewed_by_id: userId,
          reviewed_at: new Date().toISOString(),
          tc_comment: comment || null,
          rejection_reason: action === 'REJECT' ? (comment || 'Non spécifié') : null,
        })
        .eq('id', fileId)
        .select()
        .single() as any)

      // Sync status to applications table
      try {
        await (supabase as any)
          .from('applications')
          .update({ status: newStatus } as any)
          .eq('rental_file_id', fileId)
      } catch (syncErr) {
        console.error(`Failed to sync application status for file ${fileId}:`, syncErr)
      }

      await (supabase as any)
        .from('validation_slas')
        .update({ completed_at: new Date().toISOString(), is_overdue: false })
        .eq('entity_type', 'RENTAL_FILE')
        .eq('entity_id', fileId)

      await (supabase.from('audit_logs') as any).insert({
        action: auditAction,
        entity: 'RentalFile',
        entity_id: fileId,
        details: JSON.stringify({ action, comment, reviewerId: userId }),
        user_id: userId,
      })

      const notificationMessage = action === 'APPROVE'
        ? `Votre dossier locatif a été validé par le Tiers de Confiance et transmis au propriétaire.`
        : action === 'REJECT'
          ? `Votre dossier locatif a été rejeté. Raison : ${comment || 'Non spécifié'}`
          : `Le Tiers de Confiance demande des documents complémentaires : ${comment || 'Veuillez compléter votre dossier.'}`

      try {
        await notify({
          userId: file.tenant_id,
          type: 'DOSSIER_UPDATE',
          title: notificationTitle,
          message: notificationMessage,
          actionUrl: 'rental-file',
          entityId: fileId,
        })
      } catch (notifyErr) {
        console.error(`Failed to notify tenant for file ${fileId}:`, notifyErr)
      }

      results.push({ fileId, success: true, file: updatedFile })
    }

    const resp = NextResponse.json({ results })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC rental files PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
