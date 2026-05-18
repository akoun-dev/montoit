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

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const reason = url.searchParams.get('reason')

    let query = supabase.from('signalements').select('*', { count: 'exact' })
    if (status) query = query.eq('status', status)
    if (reason) query = query.eq('reason', reason)

    const { data: signalementsData } = await query.order('created_at', { ascending: false })
    const signalements = (signalementsData ?? []) as any[]

    const reporterIds = [...new Set(signalements.map(s => s.reporter_id).filter(Boolean))]
    const handledByIds = [...new Set(signalements.map(s => s.handled_by_id).filter(Boolean))]

    const [{ data: reporters }, { data: handlers }] = await Promise.all([
      reporterIds.length > 0
        ? supabase.from('users').select('id, first_name, last_name, email, role').in('id', reporterIds)
        : { data: [] as any[] },
      handledByIds.length > 0
        ? supabase.from('users').select('id, first_name, last_name').in('id', handledByIds)
        : { data: [] as any[] },
    ])

    const reporterMap = new Map((reporters ?? []).map((r: any) => [r.id, r]))
    const handlerMap = new Map((handlers ?? []).map((h: any) => [h.id, h]))

    const mapped = signalements.map((s: any) => {
      const reporter = reporterMap.get(s.reporter_id)
      const handler = handlerMap.get(s.handled_by_id)
      return {
        id: s.id,
        reason: s.reason,
        description: s.description,
        entityType: s.entity_type,
        entityId: s.entity_id,
        status: s.status,
        adminNotes: s.admin_notes,
        resolution: s.resolution,
        reporterId: s.reporter_id,
        handledById: s.handled_by_id,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        reporter: reporter ? {
          id: reporter.id,
          firstName: reporter.first_name,
          lastName: reporter.last_name,
          email: reporter.email,
          role: reporter.role,
        } : null,
        handledBy: handler ? {
          id: handler.id,
          firstName: handler.first_name,
          lastName: handler.last_name,
        } : null,
      }
    })

    const byStatus: Record<string, number> = {}
    const byReason: Record<string, number> = {}
    for (const s of signalements) {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1
      byReason[s.reason] = (byReason[s.reason] || 0) + 1
    }

    const resp = NextResponse.json({
      signalements: mapped,
      stats: { byStatus, byReason },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin signalements GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const body = await req.json()
    const { reason, description, entityType, entityId, reporterId } = body

    if (!reason || !description || !entityType || !entityId || !reporterId) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const sGen = supabase.from('signalements') as any
    const { data: signalement } = await sGen
      .insert({
        reason,
        description,
        entity_type: entityType,
        entity_id: entityId,
        reporter_id: reporterId,
      })
      .select()
      .single()

    if (!signalement) {
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
    }

    const { data: reporter } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('id', reporterId)
      .single()

    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'ADMIN')
      .eq('is_active', true)

    await Promise.all((admins ?? []).map((admin: any) =>
      notify({
        userId: admin.id,
        type: 'SYSTEM',
        title: 'Nouveau signalement',
        message: `Un signalement a été déposé : ${reason}`,
        actionUrl: 'signalements',
        entityId: signalement.id,
      })
    ))

    const resp = NextResponse.json({
      signalement: {
        ...signalement,
        reporter: reporter ? {
          id: reporter.id,
          firstName: reporter.first_name,
          lastName: reporter.last_name,
          email: reporter.email,
          role: reporter.role,
        } : null,
      },
    }, { status: 201 })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin signalements POST error:', error)
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

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const body = await req.json()
    const { id, status, adminNotes, resolution } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes
    if (resolution !== undefined) updateData.resolution = resolution
    updateData.handled_by_id = userId

    const sGen = supabase.from('signalements') as any
    const { data: signalement } = await sGen
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (!signalement) {
      return NextResponse.json({ error: 'Signalement introuvable' }, { status: 404 })
    }

    const [{ data: reporters }, { data: handlers }] = await Promise.all([
      supabase.from('users').select('id, first_name, last_name, email, role').eq('id', signalement.reporter_id),
      signalement.handled_by_id
        ? supabase.from('users').select('id, first_name, last_name').eq('id', signalement.handled_by_id)
        : { data: [] as any[] },
    ])

    const reporter = reporters?.[0] ?? null
    const handler = handlers?.[0] ?? null

    if (status) {
      const statusLabels: Record<string, string> = {
        REVIEWED: 'en cours d\'examen',
        RESOLVED: 'résolu',
        DISMISSED: 'rejeté',
      }
      await notify({
        userId: signalement.reporter_id,
        type: 'SYSTEM',
        title: 'Mise à jour de votre signalement',
        message: `Votre signalement a été ${statusLabels[status] || 'mis à jour'}.${adminNotes ? ` Note : ${adminNotes}` : ''}`,
        actionUrl: 'history',
        entityId: id,
      })
    }

    const resp = NextResponse.json({
      signalement: {
        ...signalement,
        reporter: reporter ? {
          id: reporter.id,
          firstName: reporter.first_name,
          lastName: reporter.last_name,
          email: reporter.email,
          role: reporter.role,
        } : null,
        handledBy: handler ? {
          id: handler.id,
          firstName: handler.first_name,
          lastName: handler.last_name,
        } : null,
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin signalements PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
