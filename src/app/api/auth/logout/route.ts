import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(req)

  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id

  await supabase.auth.signOut().catch((error) => {
    console.warn('Supabase signOut warning:', error)
  })

  if (userId) {
    try {
      const adminSupabase = getSupabaseAdminClient()
      await adminSupabase.from('sessions').delete().eq('user_id', userId)
    } catch {
      // ignore cleanup errors
    }
  }

  const response = NextResponse.json({ message: 'Déconnexion réussie' })
  response.cookies.set('montoit-session', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' })
  response.cookies.set('montoit-user-id', '', { maxAge: 0, path: '/' })

  return applyCookies(response)
}
