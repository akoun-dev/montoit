import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getBalance } from '@/lib/intouch'

// GET /api/payments/balance — Retrieve Intouch account balance (admin only)
export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const supabase = getSupabaseAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = user?.active_role
    if (effectiveRole !== 'ADMIN' && effectiveRole !== 'AGENCE' && effectiveRole !== 'PROPRIETAIRE') {
      return applyCookies(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }))
    }

    const result = await getBalance()

    if (!result.success) {
      return applyCookies(NextResponse.json(
        { error: result.error || 'Erreur lors de la récupération du solde' },
        { status: 502 }
      ))
    }

    return applyCookies(NextResponse.json({ data: result.data }))
  } catch (error) {
    console.error('Balance GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
