import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { RnppApiError, rnppBalance } from '../_shared/oneci.ts'

serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = await resolveUserFromRequest(req)
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = getSupabaseAdminClient()
    const { data: profile } = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()
    if ((profile?.active_role || profile?.role) !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let result
    try {
      result = await rnppBalance()
    } catch (apiErr) {
      if (apiErr instanceof RnppApiError) {
        const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' }
        if (apiErr.retryAfter) headers['Retry-After'] = apiErr.retryAfter
        return new Response(JSON.stringify(apiErr.body || { message: apiErr.message }), { status: apiErr.status, headers })
      }
      const message = apiErr instanceof Error ? apiErr.message : 'RNPP request failed'
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
