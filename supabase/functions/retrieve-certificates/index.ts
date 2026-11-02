import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { cryptoneoFetch, isCryptoneoSuccess } from '../_shared/cryptoneo.ts'

// Types for CRYPTONEO users API response
interface CryptoneoUser {
  alias?: string
  nom?: string
  prenom?: string
  email?: string
  phone?: string
  generationState?: string
  hexacertserialnumber?: string
  issuerdn?: string
  generationEndingDate?: number
}

interface CryptoneoUsersResponse {
  statusCode?: number
  statusMessage?: string
  data?: CryptoneoUser[]
}

serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const url = new URL(req.url)

    // Extract search parameters
    const params = {
      alias: url.searchParams.get('alias') || '',
      name: (url.searchParams.get('name') || '').toLowerCase(),
      phone: url.searchParams.get('phone') || '',
      state: (url.searchParams.get('state') || '').toLowerCase(),
      email: (url.searchParams.get('email') || '').toLowerCase(),
    }

    const res = await cryptoneoFetch('/generateCert/users')

    const responseText = await res.text()
    let result: CryptoneoUsersResponse
    try { result = JSON.parse(responseText) } catch { result = {} }

    if (!res.ok || !isCryptoneoSuccess(result as any)) {
      return new Response(JSON.stringify({
        error: result?.statusMessage || 'Failed to retrieve certificates',
        statusCode: result?.statusCode || res.status,
      }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let users = result?.data || []

    // Filtrer côté client si des paramètres sont fournis
    if (params.alias) users = users.filter((u: any) => u.alias === params.alias)
    if (params.email) users = users.filter((u: any) => u.email?.toLowerCase() === params.email)
    if (params.phone) users = users.filter((u: any) => u.phone === params.phone)
    if (params.name) users = users.filter((u: any) => (u.nom + ' ' + u.prenom).toLowerCase().includes(params.name))
    if (params.state) users = users.filter((u: any) => u.generationState?.toLowerCase() === params.state)

    return new Response(JSON.stringify({
      data: users,
      statusCode: 200,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
