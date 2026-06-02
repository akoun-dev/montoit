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
    const type = searchParams.get('type')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50
    const offset = offsetParam ? parseInt(offsetParam) : 0

    let query = supabase
      .from('ownership_documents')
      .select('*', { count: 'exact' })

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    } else if (!status) {
      query = query.eq('status', 'PENDING')
    }
    // status=ALL => no filter

    if (type) {
      query = query.eq('type', type)
    }

    query = query
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: docsData, count: total } = await (query as any)
    const docsRaw = (docsData ?? []) as any[]

    const ownerIds = [...new Set(docsRaw.map((d: any) => d.owner_id).filter(Boolean))]
    const reviewerIds = [...new Set(docsRaw.map((d: any) => d.reviewed_by_id).filter(Boolean))]
    const allUserIds = [...new Set([...ownerIds, ...reviewerIds])]

    const { data: usersData } = allUserIds.length > 0
      ? await ((supabase.from('users') as any).select('id, first_name, last_name, phone, email, avatar_url').in('id', allUserIds))
      : { data: [] as any[] }

    const userMap = new Map<string, any>((usersData ?? []).map((u: any) => [u.id, u]))

    const docs = docsRaw.map((d: any) => ({
      id: d.id,
      ownerId: d.owner_id,
      name: d.name,
      type: d.type,
      url: d.url,
      status: d.status,
      tcComment: d.tc_comment,
      reviewedById: d.reviewed_by_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      owner: userMap.get(d.owner_id) ? {
        id: userMap.get(d.owner_id).id,
        firstName: userMap.get(d.owner_id).first_name,
        lastName: userMap.get(d.owner_id).last_name,
        phone: userMap.get(d.owner_id).phone,
        email: userMap.get(d.owner_id).email,
        avatarUrl: userMap.get(d.owner_id).avatar_url,
      } : null,
      reviewedBy: userMap.get(d.reviewed_by_id) ? {
        id: userMap.get(d.reviewed_by_id).id,
        firstName: userMap.get(d.reviewed_by_id).first_name,
        lastName: userMap.get(d.reviewed_by_id).last_name,
      } : null,
    }))

    const resp = NextResponse.json({
      docs,
      pagination: {
        total: total ?? 0,
        limit,
        offset,
        hasMore: offset + limit < (total ?? 0),
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC ownership docs GET error:', error)
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
    const { docIds, action, comment } = body

    if (!docIds || !Array.isArray(docIds) || docIds.length === 0) {
      return NextResponse.json({ error: 'docIds est requis (tableau non vide)' }, { status: 400 })
    }
    if (!action || !['APPROVE', 'REJECT', 'REQUEST_INFO'].includes(action)) {
      return NextResponse.json({ error: 'action doit être APPROVE, REJECT ou REQUEST_INFO' }, { status: 400 })
    }

    const results: any[] = []

    for (const docId of docIds) {
      const { data: doc } = await ((supabase as any)
        .from('ownership_documents')
        .select('*, owner:users!owner_id(*)')
        .eq('id', docId)
        .single() as any)

      if (!doc) {
        results.push({ docId, success: false, error: 'Document introuvable' })
        continue
      }

      if (doc.status !== 'PENDING') {
        results.push({ docId, success: false, error: 'Ce document n\'est pas en attente de validation' })
        continue
      }

      let newStatus: string
      let auditAction: string
      let notificationTitle: string

      if (action === 'APPROVE') {
        newStatus = 'VALIDATED'
        auditAction = 'OWNERSHIP_DOC_APPROVED'
        notificationTitle = 'Document de propriété validé'
      } else if (action === 'REJECT') {
        newStatus = 'REJECTED'
        auditAction = 'OWNERSHIP_DOC_REJECTED'
        notificationTitle = 'Document de propriété rejeté'
      } else {
        newStatus = 'PENDING'
        auditAction = 'OWNERSHIP_DOC_INFO_REQUESTED'
        notificationTitle = 'Document complémentaire requis'
      }

      const { data: updatedDoc } = await ((supabase as any)
        .from('ownership_documents')
        .update({
          status: newStatus,
          reviewed_by_id: userId,
          tc_comment: comment || null,
        })
        .eq('id', docId)
        .select('*, owner:users!owner_id(id, first_name, last_name, email)')
        .single() as any)

      await (supabase as any)
        .from('validation_slas')
        .update({ completed_at: new Date().toISOString(), is_overdue: false })
        .eq('entity_type', 'OWNER_PROFILE')
        .eq('entity_id', docId)

      await (supabase.from('audit_logs') as any).insert({
        action: auditAction,
        entity: 'OwnershipDocument',
        entity_id: docId,
        details: JSON.stringify({ action, comment, reviewerId: userId }),
        user_id: userId,
      })

      const notificationMessage = action === 'APPROVE'
        ? `Votre document "${doc.name}" a été validé par le Tiers de Confiance.`
        : action === 'REJECT'
          ? `Votre document "${doc.name}" a été rejeté. Raison : ${comment || 'Non spécifié'}`
          : `Le Tiers de Confiance demande un complément pour "${doc.name}" : ${comment || 'Veuillez fournir un document plus lisible.'}`

      await notify({
        userId: doc.owner_id,
        type: 'DOSSIER_UPDATE',
        title: notificationTitle,
        message: notificationMessage,
        actionUrl: 'owner-file',
        entityId: docId,
      })

      results.push({ docId, success: true, doc: updatedDoc })
    }

    const resp = NextResponse.json({ results })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC ownership docs PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
