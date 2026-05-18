import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server'

export async function resolveRequestUser(req: NextRequest): Promise<{
  userId: string | null
  authSource: 'supabase' | null
  applyCookies: (response: NextResponse) => NextResponse
}> {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return {
    userId: user?.id ?? null,
    authSource: user ? 'supabase' : null,
    applyCookies,
  }
}
