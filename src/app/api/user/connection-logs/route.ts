import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const limitParam = req.nextUrl.searchParams.get('limit')
    const limit = Math.min(Math.max(parseInt(limitParam || '20', 10) || 20, 1), 100)

    const { data: logs } = await ((supabase as any)
      .from('connection_logs')
      .select('id, ip_address, user_agent, device, location, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit) as any)

    const mappedLogs = (logs ?? []).map((log: any) => ({
      id: log.id,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      device: log.device,
      location: log.location,
      createdAt: log.created_at,
    }))

    const resp = NextResponse.json({ logs: mappedLogs })
    return applyCookies(resp)
  } catch (error) {
    console.error('Connection logs GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
