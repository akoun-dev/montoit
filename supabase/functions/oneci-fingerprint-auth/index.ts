import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { RnppApiError, rnppFingerprintAuth } from '../_shared/oneci.ts'

serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes
  try {
    if (req.method !== 'POST') return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const userId = await resolveUserFromRequest(req)
    if (!userId) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength > 1024 * 1024) return new Response(JSON.stringify({ message: 'Fingerprint payload exceeds the 1 MB limit' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: dbUser } = await getSupabaseAdminClient().from('users').select('nni').eq('id', userId).maybeSingle()
    const body = await req.json()
    const nni = body.nni || dbUser?.nni
    const fingerprintData = body.fingerprintData
    if (!nni || typeof fingerprintData !== 'string' || fingerprintData.length < 10) return new Response(JSON.stringify({ message: 'NNI and fingerprintData are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const result = await rnppFingerprintAuth({ nni, fingerprintData })
    const code = result.Code ?? result.code
    const authenticated = result.authenticated === true || code === 200 || code === '200'

    await getSupabaseAdminClient().from('oneci_verifications').insert({
      user_id: userId,
      method: 'FINGERPRINT_AUTH',
      status: authenticated ? 'PASSED' : 'FAILED',
      score: result?.score ?? null,
      provider_response: result ?? null,
      failure_reason: authenticated ? null : (result?.message || null),
    })

    return new Response(JSON.stringify({ ...result, authenticated }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' }
    if (err instanceof RnppApiError && err.retryAfter) headers['Retry-After'] = err.retryAfter
    const status = err instanceof RnppApiError ? err.status : 502
    const body = err instanceof RnppApiError ? (err.body || { message: err.message }) : { message: err instanceof Error ? err.message : 'RNPP request failed' }
    return new Response(JSON.stringify(body), { status, headers })
  }
})
