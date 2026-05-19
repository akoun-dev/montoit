import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { oneciCheckSubscription } from '../_shared/oneci.ts'

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

    const apiKey = Deno.env.get('ONECI_API_KEY')
    const secretKey = Deno.env.get('ONECI_SECRET_KEY')
    if (!apiKey || !secretKey) {
      return new Response(JSON.stringify({ error: 'ONECI API credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let result
    try {
      result = await oneciCheckSubscription()
    } catch (apiErr) {
      const message = apiErr instanceof Error ? apiErr.message : 'ONECI request failed'
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = result?.data || result

    return new Response(JSON.stringify({
      remainingRequests: data?.remainingRequests ?? result?.remainingRequests ?? null,
      totalRequests: data?.totalRequests ?? result?.totalRequests ?? null,
      usedRequests: data?.usedRequests ?? result?.usedRequests ?? null,
    }), {
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
