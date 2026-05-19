import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { cryptoneoFetch, type CryptoneoSignResponse, type SignRequestItem } from '../_shared/cryptoneo.ts'

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

    const { otp, signRequest, callBackUrl } = await req.json()

    if (!otp) {
      return new Response(JSON.stringify({ error: 'otp is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!Array.isArray(signRequest) || signRequest.length === 0) {
      return new Response(JSON.stringify({ error: 'signRequest must be a non-empty array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: Record<string, unknown> = {
      aliasCertificat: alias.alias_certificat,
      otp,
      signRequest: signRequest as SignRequestItem[],
    }

    if (callBackUrl) payload.callBackUrl = callBackUrl

    const res = await cryptoneoFetch('/sign/signFileBatch', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const result: CryptoneoSignResponse = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: result?.statusMessage || 'Signing failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ operationId: result?.data?.operationId, data: result?.data }), {
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
