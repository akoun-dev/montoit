import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await (supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single())
    const effectiveRole = profile?.active_role || profile?.role

    const { id } = await params

    let whereQuery = supabase.from('maintenance_requests').select('id, tenant_id, lease_id').eq('id', id)
    if (effectiveRole === 'LOCATAIRE') {
      whereQuery = whereQuery.eq('tenant_id', userId)
    } else if (effectiveRole === 'PROPRIETAIRE' || effectiveRole === 'AGENCE') {
      const { data: ownerLeases } = await (supabase
        .from('leases')
        .select('id')
        .eq('owner_id', userId))
      const leaseIds = (ownerLeases ?? []).map((l: any) => l.id)
      if (leaseIds.length > 0) {
        whereQuery = whereQuery.in('lease_id', leaseIds)
      } else {
        whereQuery = whereQuery.eq('lease_id', '__nonexistent__')
      }
    } else {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: maintenanceRequest } = await (whereQuery.maybeSingle())

    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: 'Demande introuvable ou accès refusé' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const { data: comments, count: total } = await (supabase
      .from('maintenance_comments')
      .select('*', { count: 'exact' })
      .eq('maintenance_request_id', id)
      .order('created_at', { ascending: true })
      .range((page - 1) * limit, page * limit - 1))

    const authorIds = [...new Set((comments ?? []).map((c: any) => c.author_id))]
    let authorMap: Record<string, any> = {}
    if (authorIds.length > 0) {
      const { data: authors } = await (supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, role')
        .in('id', authorIds))
      for (const a of authors ?? []) {
        authorMap[a.id] = {
          id: a.id,
          firstName: a.first_name,
          lastName: a.last_name,
          avatarUrl: a.avatar_url,
          role: a.role,
        }
      }
    }

    const mappedComments = (comments ?? []).map((c: any) => ({
      id: c.id,
      content: c.content,
      maintenanceRequestId: c.maintenance_request_id,
      authorId: c.author_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      author: authorMap[c.author_id] || null,
    }))

    const resp = NextResponse.json({
      data: mappedComments,
      pagination: {
        page,
        limit,
        total: total ?? 0,
        totalPages: Math.ceil((total ?? 0) / limit),
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Maintenance comments GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await (supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single())
    const effectiveRole = profile?.active_role || profile?.role

    const { id } = await params
    const body = await req.json()
    const { content } = body as { content?: string }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le contenu du commentaire est requis' },
        { status: 400 }
      )
    }

    if (content.trim().length > 2000) {
      return NextResponse.json(
        { error: 'Le commentaire ne peut pas dépasser 2000 caractères' },
        { status: 400 }
      )
    }

    let whereQuery = supabase.from('maintenance_requests').select('id, tenant_id, title, status, lease_id').eq('id', id)
    if (effectiveRole === 'LOCATAIRE') {
      whereQuery = whereQuery.eq('tenant_id', userId)
    } else if (effectiveRole === 'PROPRIETAIRE' || effectiveRole === 'AGENCE') {
      const { data: ownerLeases } = await (supabase
        .from('leases')
        .select('id')
        .eq('owner_id', userId))
      const leaseIds = (ownerLeases ?? []).map((l: any) => l.id)
      if (leaseIds.length > 0) {
        whereQuery = whereQuery.in('lease_id', leaseIds)
      } else {
        whereQuery = whereQuery.eq('lease_id', '__nonexistent__')
      }
    } else {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: mrData } = await (whereQuery.maybeSingle())
    const maintenanceRequest = mrData as any

    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: 'Demande introuvable ou accès refusé' },
        { status: 404 }
      )
    }

    if (maintenanceRequest.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Impossible d\'ajouter un commentaire sur une demande fermée' },
        { status: 400 }
      )
    }

    const { data: insertedComment } = await (supabase
      .from('maintenance_comments')
      .insert({
        content: content.trim(),
        maintenance_request_id: id,
        author_id: userId,
      } as any)
      .select('id, content, maintenance_request_id, author_id, created_at, updated_at')
      .single())
    const newComment = insertedComment as any

    const { data: authorData } = await (supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url, role')
      .eq('id', userId)
      .single())
    const author = authorData as any

    const mappedComment = {
      ...newComment,
      maintenanceRequestId: newComment.maintenance_request_id,
      authorId: newComment.author_id,
      createdAt: newComment.created_at,
      updatedAt: newComment.updated_at,
      author: author ? {
        id: author.id,
        firstName: author.first_name,
        lastName: author.last_name,
        avatarUrl: author.avatar_url,
        role: author.role,
      } : null,
    }

    await supabase.from('audit_logs').insert({
      action: 'COMMENT',
      entity: 'MaintenanceRequest',
      entity_id: id,
      details: `Commentaire ajouté par ${effectiveRole} sur la demande: ${maintenanceRequest.title}`,
      user_id: userId,
    })

    let notifyUserId: string | undefined
    if (effectiveRole === 'LOCATAIRE') {
      const { data: mr } = await (supabase
        .from('maintenance_requests')
        .select('lease_id')
        .eq('id', id)
        .single())
      if (mr) {
        const mrRow = mr as any
        const { data: lease } = await (supabase
          .from('leases')
          .select('owner_id')
          .eq('id', mrRow.lease_id)
          .single())
        notifyUserId = (lease as any)?.owner_id
      }
    } else {
      notifyUserId = maintenanceRequest.tenant_id
    }

    if (notifyUserId) {
      await notify({
        userId: notifyUserId,
        type: 'MAINTENANCE',
        title: 'Nouveau commentaire sur la demande de maintenance',
        message: `Un nouveau commentaire a été ajouté sur "${maintenanceRequest.title}".`,
        actionUrl: 'maintenance',
        entityId: id,
      })
    }

    const resp = NextResponse.json({ data: mappedComment }, { status: 201 })
    return applyCookies(resp)
  } catch (error) {
    console.error('Maintenance comments POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
