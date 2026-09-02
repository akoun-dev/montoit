import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { RnppApiError, rnppPerson } from '../_shared/oneci.ts'

serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes
  try {
    if (req.method !== 'GET') return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (!await resolveUserFromRequest(req)) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const nni = new URL(req.url).searchParams.get('nni')
    if (!nni) return new Response(JSON.stringify({ message: 'NNI is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const result = await rnppPerson(nni)
    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' }
    if (err instanceof RnppApiError && err.retryAfter) headers['Retry-After'] = err.retryAfter
    const status = err instanceof RnppApiError ? err.status : 502
    const body = err instanceof RnppApiError ? (err.body || { message: err.message }) : { message: err instanceof Error ? err.message : 'RNPP request failed' }
    return new Response(JSON.stringify(body), { status, headers })
  }
})
