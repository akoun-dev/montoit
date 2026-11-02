import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { cryptoneoFetch, isCryptoneoSuccess, normalizeCryptoneoGender, type CryptoneoCertificatResponse, type CryptoneoUsersResponse } from '../_shared/cryptoneo.ts'

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

    const { firstName, lastName, gender, email, phone, organisation, typePiece, hashPiece, base64 } = await req.json()

    if (!firstName || !lastName || !gender || !email || !phone || !organisation) {
      console.log('[generate-certificate] Missing required fields:', { firstName, lastName, gender, email, phone, organisation })
      return new Response(JSON.stringify({ error: 'firstName, lastName, gender, email, phone and organisation are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[generate-certificate] Checking local alias for user:', userId)
    const { data: existingAlias } = await supabase
      .from('signature_aliases')
      .select('alias_certificat')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    console.log('[generate-certificate] Local alias found:', existingAlias)

    if (existingAlias?.alias_certificat) {
      return new Response(JSON.stringify({ aliasCertificat: existingAlias.alias_certificat, existing: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if a certificate already exists in CRYPTONEO for this email/phone
    console.log('[generate-certificate] Checking CRYPTONEO for existing certificate:', { email, phone })
    const checkRes = await cryptoneoFetch('/generateCert/users')

    console.log('[generate-certificate] CRYPTONEO users check status:', checkRes.status)

    if (checkRes.ok) {
      const checkResult: CryptoneoUsersResponse = await checkRes.json()
      console.log('[generate-certificate] CRYPTONEO users result:', JSON.stringify(checkResult))
      const user = (checkResult?.data || []).find((u: any) => u.email === email || u.phone === phone)
      const existingCryptoneoAlias = user?.alias

      if (existingCryptoneoAlias) {
        console.log('[generate-certificate] Found existing alias in CRYPTONEO, syncing:', existingCryptoneoAlias)
        // Certificate exists in CRYPTONEO, sync with local database
        await supabase
          .from('signature_aliases')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('is_active', true)

        await supabase.from('signature_aliases').insert({
          user_id: userId,
          alias_certificat: existingCryptoneoAlias,
          email,
          phone,
          is_active: true,
        })

        return new Response(JSON.stringify({
          aliasCertificat: existingCryptoneoAlias,
          existing: true,
          syncedFromCryptoneo: true,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      console.log('[generate-certificate] No existing alias found in CRYPTONEO for this email/phone')
    } else {
      const errText = await checkRes.text().catch(() => '')
      console.log('[generate-certificate] CRYPTONEO users check failed:', checkRes.status, errText)
    }

    const now = new Date()
    const consentDate = now.toISOString().replace('T', ' ').substring(0, 19)

    const payload: Record<string, unknown> = {
      firstName,
      lastName,
      gender: normalizeCryptoneoGender(gender),
      email,
      phone,
      organisation,
      consent: true,
      consentDate,
    }

    if (typePiece) payload.typePiece = typePiece
    if (hashPiece) payload.hashPiece = hashPiece
    if (base64) payload.base64 = base64

    console.log('[generate-certificate] Generating certificate via CRYPTONEO for email:', email)
    const res = await cryptoneoFetch('/generateCert/generateCertificat', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const certResponseText = await res.text()
    console.log('[generate-certificate] CRYPTONEO generateCertificat response:', { status: res.status, body: certResponseText })

    let result: CryptoneoCertificatResponse
    try { result = JSON.parse(certResponseText) } catch { result = {} }

    if (!res.ok || !isCryptoneoSuccess(result as any) || !result?.data?.aliasCertificat) {
      return new Response(JSON.stringify({ error: result?.statusMessage || 'Certificate generation failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aliasCertificat = result.data.aliasCertificat
    console.log('[generate-certificate] Certificate generated, alias:', aliasCertificat)

    await supabase
      .from('signature_aliases')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true)

    await supabase.from('signature_aliases').insert({
      user_id: userId,
      alias_certificat: aliasCertificat,
      email,
      phone,
      is_active: true,
    })

    console.log('[generate-certificate] Alias saved locally for user:', userId)
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
