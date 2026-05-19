import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { cryptoneoFetch } from '../_shared/cryptoneo.ts'

serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    if (req.method !== 'POST') {
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

    const { data: alias } = await supabase
      .from('signature_aliases')
      .select('alias_certificat')
      .eq('user_id', userId)
      .eq('active', true)
      .maybeSingle()

    if (!alias?.alias_certificat) {
      return new Response(JSON.stringify({ error: 'No active signature alias found. Generate a certificate first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { canal } = await req.json()

    const body: Record<string, string> = { aliasCertificat: alias.alias_certificat }
    if (canal && (canal === 'MAIL' || canal === 'SMS')) {
      body.canal = canal
    }

    const res = await cryptoneoFetch('/otp/send', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return new Response(JSON.stringify({ error: errData?.statusMessage || 'Failed to send OTP' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
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
