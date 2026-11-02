import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getUserProfileById } from '@/lib/supabase/email-auth'
import { toProfilePayload } from '@/lib/supabase/profile'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()
    const user = await getUserProfileById(admin, userId)

    if (!user || !user.is_active) {
      const response = NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 401 })
      return applyCookies(response)
    }

    const response = NextResponse.json({
      user: toProfilePayload(user),
    })

    return applyCookies(response)
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
