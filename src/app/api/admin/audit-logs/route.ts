import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()

    const { data: profile } = await admin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    // Failed logins (audit_logs with LOGIN_FAILED action)
    const { data: failedLogins } = await admin
      .from('audit_logs')
      .select('user_id, id, action, entity, entity_id, details, created_at')
      .eq('action', 'LOGIN_FAILED')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Admin actions (all audit_logs from admin users)
    const { data: adminActions } = await admin
      .from('audit_logs')
      .select('user_id, id, action, entity, entity_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Collect unique user IDs from both logs
    const allUserIds = new Set<string>()
    for (const log of [...(failedLogins ?? []), ...(adminActions ?? [])]) {
      if (log.user_id) allUserIds.add(log.user_id)
    }

    // Fetch all referenced users in one query
    const userIdsArray = [...allUserIds]
    const { data: users } = userIdsArray.length > 0
      ? await admin.from('users').select('id, first_name, last_name, email').in('id', userIdsArray)
      : { data: [] }
    const userMap = new Map((users ?? []).map((u: any) => [u.id, { firstName: u.first_name ?? '', lastName: u.last_name ?? '', email: u.email ?? '' }]))

    // Map to camelCase with user data joined in JS
    const mapLog = (log: any) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      details: log.details,
      createdAt: log.created_at,
      user: userMap.get(log.user_id) ?? { firstName: '', lastName: '', email: '' },
    })

    const mappedFailedLogins = (failedLogins ?? []).map(mapLog)
    const mappedAdminActions = (adminActions ?? []).map(mapLog)

    const resp = NextResponse.json({
      failedLogins: mappedFailedLogins,
      adminActions: mappedAdminActions,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin audit logs GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
