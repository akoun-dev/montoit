import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    const effectiveRole = userRow?.role

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const entity = searchParams.get('entity') || undefined
    const action = searchParams.get('action') || undefined

    let query = supabase
      .from('audit_logs')
      .select('id, action, entity, entity_id, details, created_at, user_id', { count: 'exact' })

    if (effectiveRole !== 'ADMIN') {
      query = query.eq('user_id', userId)
    }
    if (entity) {
      query = query.eq('entity', entity)
    }
    if (action) {
      query = query.eq('action', action)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: logs, count: total, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    const userIds = [...new Set((logs || []).map((l: { user_id: string }) => l.user_id))]
    let userMap: Record<string, { first_name: string; last_name: string }> = {}
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds)
      if (users) {
        for (const u of users) {
          userMap[u.id] = u
        }
      }
    }

    const mappedLogs = (logs || []).map((log: Record<string, unknown>) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entity_id,
      details: log.details,
      createdAt: log.created_at,
      user: userMap[log.user_id as string]
        ? {
            firstName: userMap[log.user_id as string].first_name,
            lastName: userMap[log.user_id as string].last_name,
          }
        : null,
    }))

    const resp = NextResponse.json({
      logs: mappedLogs,
      data: mappedLogs,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('History GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
