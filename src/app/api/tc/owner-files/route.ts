import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

/** Returns a Map of fileId → last rejection date (ISO string) */
async function fetchRejectionHistory(supabase: any, fileIds: string[]): Promise<Map<string, string>> {
  if (fileIds.length === 0) return new Map()
  const { data: rejectionLogs } = await (supabase.from('audit_logs') as any)
    .select('entity_id, created_at')
    .eq('action', 'OWNER_FILE_REJECTED')
    .in('entity_id', fileIds)
    .order('created_at', { ascending: false })
  const map = new Map<string, string>()
  for (const log of (rejectionLogs ?? []) as any[]) {
    if (!map.has(log.entity_id)) {
      map.set(log.entity_id, log.created_at)
    }
  }
  return map
}

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
    const id = searchParams.get('id')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50
    const offset = offsetParam ? parseInt(offsetParam) : 0

    let query = supabase
      .from('owner_files')
      .select('*', { count: 'exact' })

    if (id) {
      query = query.eq('id', id)
    } else if (status && status !== 'ALL') {
      query = query.eq('status', status)
    } else if (!status) {
      query = query.eq('status', 'SUBMITTED')
    } else {
      // status=ALL : on exclut explicitement DRAFT. Le TC n'a aucune raison
      // de voir les dossiers que le propriétaire n'a pas encore soumis.
      query = query.neq('status', 'DRAFT')
    }

    query = query
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: filesData, count: total } = await (query as any)
    const filesRaw = (filesData ?? []) as any[]

    const ownerIds = [...new Set(filesRaw.map((f: any) => f.owner_id).filter(Boolean))]
    const fileIds = filesRaw.map((f: any) => f.id)

    const rejectionHistory = await fetchRejectionHistory(supabase, fileIds)

    const [ownersResult, documentsResult] = await Promise.all([
      ownerIds.length > 0
        ? (supabase.from('users') as any).select('id, first_name, last_name, phone, email, avatar_url').in('id', ownerIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      fileIds.length > 0
        ? (supabase.from('owner_file_documents') as any).select('*').in('owner_file_id', fileIds).order('created_at', { ascending: true })
        : Promise.resolve({ data: [] as any[], error: null }),
    ])

    const ownerMap = new Map<string, any>((ownersResult.data ?? []).map((o: any) => [o.id, o]))
    const docByFile = new Map<string, any[]>()
    for (const doc of (documentsResult.data ?? []) as any[]) {
      if (!docByFile.has(doc.owner_file_id)) docByFile.set(doc.owner_file_id, [])
      docByFile.get(doc.owner_file_id)!.push(doc)
    }

    const files = filesRaw.map((f: any) => {
      const owner = ownerMap.get(f.owner_id)
      const documents = (docByFile.get(f.id) ?? []).map((d: any) => ({
        id: d.id,
        ownerFileId: d.owner_file_id,
        type: d.type,
        name: d.name,
        url: d.url,
        status: d.status,
        tcComment: d.tc_comment,
        createdAt: d.created_at,
      }))

      return {
        id: f.id,
        ownerId: f.owner_id,
        status: f.status,
        tcComment: f.tc_comment,
        rejectionReason: f.rejection_reason,
        reviewedById: f.reviewed_by_id,
        reviewedAt: f.reviewed_at,
        previouslyRejected: rejectionHistory.has(f.id),
        lastRejectedAt: rejectionHistory.get(f.id) ?? null,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
        owner: owner ? {
          id: owner.id,
          firstName: owner.first_name,
          lastName: owner.last_name,
          phone: owner.phone,
          email: owner.email,
          avatarUrl: owner.avatar_url,
        } : null,
        documents,
      }
    })

    const resp = NextResponse.json({
      files,
      pagination: {
        total: total ?? 0,
        limit,
        offset,
        hasMore: offset + limit < (total ?? 0),
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC owner files GET error:', error)
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
    const { fileIds, action, comment, documentUpdates } = body

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'fileIds est requis (tableau non vide)' }, { status: 400 })
    }
    if (!action || !['APPROVE', 'REJECT', 'REQUEST_INFO'].includes(action)) {
      return NextResponse.json({ error: 'action doit être APPROVE, REJECT ou REQUEST_INFO' }, { status: 400 })
    }

    const results: any[] = []

    for (const fileId of fileIds) {
      const { data: file } = await ((supabase as any)
        .from('owner_files')
        .select('*, owner:users!owner_id(*)')
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
        auditAction = 'OWNER_FILE_APPROVED'
        notificationTitle = 'Dossier propriétaire validé'
      } else if (action === 'REJECT') {
        newStatus = 'REJECTED'
        auditAction = 'OWNER_FILE_REJECTED'
        notificationTitle = 'Dossier propriétaire rejeté'
      } else {
        newStatus = 'TC_REVIEW'
        auditAction = 'OWNER_FILE_INFO_REQUESTED'
        notificationTitle = 'Documents complémentaires requis'
      }

      // Update individual document statuses if provided
      if (documentUpdates && Array.isArray(documentUpdates)) {
        for (const docUpdate of documentUpdates) {
          if (docUpdate.documentId && docUpdate.status) {
            await (supabase as any)
              .from('owner_file_documents')
              .update({
                status: docUpdate.status,
                tc_comment: docUpdate.comment || null,
              })
              .eq('id', docUpdate.documentId)
          }
        }
      }

      const { data: updatedFile } = await ((supabase as any)
        .from('owner_files')
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

      await (supabase.from('audit_logs') as any).insert({
        action: auditAction,
        entity: 'OwnerFile',
        entity_id: fileId,
        details: JSON.stringify({ action, comment, reviewerId: userId }),
        user_id: userId,
      })

      const notificationMessage = action === 'APPROVE'
        ? `Votre dossier propriétaire a été validé par le Tiers de Confiance.`
        : action === 'REJECT'
          ? `Votre dossier propriétaire a été rejeté. Raison : ${comment || 'Non spécifié'}`
          : `Le Tiers de Confiance demande des documents complémentaires : ${comment || 'Veuillez compléter votre dossier.'}`

      try {
        await notify({
          userId: file.owner_id,
          type: 'DOSSIER_UPDATE',
          title: notificationTitle,
          message: notificationMessage,
          actionUrl: 'owner-file',
          entityId: fileId,
        })
      } catch (notifyErr) {
        console.error(`Failed to notify owner for file ${fileId}:`, notifyErr)
      }

      results.push({ fileId, success: true, file: updatedFile })
    }

    const resp = NextResponse.json({ results })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC owner files PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
