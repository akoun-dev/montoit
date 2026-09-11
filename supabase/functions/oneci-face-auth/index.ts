import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { RnppApiError, rnppFaceAuth } from '../_shared/oneci.ts'

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

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, oneci_verified, nni')
      .eq('id', userId)
      .maybeSingle()

    const { nni, faceImage } = await req.json()

    const resolvedNni = nni || dbUser?.nni

    if (!resolvedNni) {
      return new Response(JSON.stringify({ error: 'NNI is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength > 2 * 1024 * 1024) {
      return new Response(JSON.stringify({ message: 'Face payload exceeds the 2 MB limit' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!faceImage || typeof faceImage !== 'string' || faceImage.length < 100) {
      return new Response(JSON.stringify({ message: 'A valid faceImage base64 string is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let result
    try {
      result = await rnppFaceAuth({ nni: resolvedNni, faceImage })
    } catch (apiErr) {
      if (apiErr instanceof RnppApiError) {
        const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' }
        if (apiErr.retryAfter) headers['Retry-After'] = apiErr.retryAfter
        return new Response(JSON.stringify(apiErr.body || { message: apiErr.message }), { status: apiErr.status, headers })
      }
      const message = apiErr instanceof Error ? apiErr.message : 'RNPP request failed'
      if (apiErr instanceof DOMException && apiErr.name === 'AbortError') {
        return new Response(JSON.stringify({ message: 'RNPP request timed out' }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resultCode = result?.Code ?? result?.code
    const authenticated = result?.authenticated === true || resultCode === 200 || resultCode === '200'

    await supabase.from('oneci_verifications').insert({
      user_id: userId,
      method: 'FACE_AUTH',
      status: authenticated ? 'PASSED' : 'FAILED',
      score: result?.score ?? null,
      provider_response: result ?? null,
      failure_reason: authenticated ? null : (result?.message || null),
    })

    if (authenticated) {
      await supabase.from('users').update({
        oneci_verified: true,
        oneci_verified_at: new Date().toISOString(),
        nni: resolvedNni,
      }).eq('id', userId)

      return new Response(JSON.stringify({
        authenticated: true,
        score: result.score || null,
        message: result.message || 'Face authenticated successfully',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      authenticated: false,
      score: result?.score || null,
      message: result?.message || 'Face authentication failed',
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
