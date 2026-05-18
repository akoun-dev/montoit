import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { cryptoneoFetch, type CryptoneoCertificatResponse } from '../_shared/cryptoneo.ts'

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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = getSupabaseAdminClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { firstName, lastName, gender, email, phone, organisation, typePiece, hashPiece, base64 } = await req.json()

    if (!firstName || !lastName || !email) {
      return new Response(JSON.stringify({ error: 'firstName, lastName and email are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: existingAlias } = await supabase
      .from('signature_aliases')
      .select('alias_certificat')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle()

    if (existingAlias?.alias_certificat) {
      return new Response(JSON.stringify({ aliasCertificat: existingAlias.alias_certificat, existing: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: Record<string, unknown> = {
      firstName,
      lastName,
      email,
    }

    if (gender) payload.gender = gender
    if (phone) payload.phone = phone
    if (organisation) payload.organisation = organisation
    if (typePiece) payload.typePiece = typePiece
    if (hashPiece) payload.hashPiece = hashPiece
    if (base64) payload.base64 = base64

    const res = await cryptoneoFetch('/generateCert/generateCertificat', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const result: CryptoneoCertificatResponse = await res.json()

    if (!res.ok || !result?.data?.aliasCertificat) {
      return new Response(JSON.stringify({ error: result?.statusMessage || 'Certificate generation failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aliasCertificat = result.data.aliasCertificat

    await supabase
      .from('signature_aliases')
      .update({ active: false })
      .eq('user_id', user.id)
      .eq('active', true)

    await supabase.from('signature_aliases').insert({
      user_id: user.id,
      alias_certificat: aliasCertificat,
      email,
      phone,
      active: true,
    })

    return new Response(JSON.stringify({ aliasCertificat, existing: false }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
