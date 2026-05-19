import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { oneciFaceAuth } from '../_shared/oneci.ts'

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

    const apiKey = Deno.env.get('ONECI_API_KEY')
    const secretKey = Deno.env.get('ONECI_SECRET_KEY')
    if (!apiKey || !secretKey) {
      return new Response(JSON.stringify({ error: 'ONECI API credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, oneci_verified, nni')
      .eq('id', userId)
      .maybeSingle()

    if (dbUser?.oneci_verified) {
      return new Response(JSON.stringify({ error: 'User already ONECI verified' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { nni, faceImage } = await req.json()

    const resolvedNni = nni || dbUser?.nni

    if (!resolvedNni) {
      return new Response(JSON.stringify({ error: 'NNI is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!faceImage || typeof faceImage !== 'string' || faceImage.length < 100) {
      return new Response(JSON.stringify({ error: 'Valid faceImage base64 string is required (min 100 characters)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let result
    try {
      result = await oneciFaceAuth({ nni: resolvedNni, faceImage })
    } catch (apiErr) {
      const message = apiErr instanceof Error ? apiErr.message : 'ONECI request failed'
      if (apiErr instanceof DOMException && apiErr.name === 'AbortError') {
        return new Response(JSON.stringify({ error: 'ONECI request timed out' }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (result?.authenticated) {
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
