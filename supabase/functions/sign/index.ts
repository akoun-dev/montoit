import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { cryptoneoFetch, cryptoneoFetchJson, isCryptoneoSuccess, normalizeCryptoneoGender, type CryptoneoCertificatResponse, type CryptoneoSignResponse, type CryptoneoUsersResponse, type SignRequestItem } from '../_shared/cryptoneo.ts'

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
    console.log('[sign] Starting sign process for user:', userId)

    // ── Vérifier l'alias dans la base locale ──
    console.log('[sign] Checking local alias for user:', userId)
    const { data: alias } = await supabase
      .from('signature_aliases')
      .select('alias_certificat')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    console.log('[sign] Local alias:', alias)
    let aliasCertificat: string | undefined

    // Récupérer le profil pour vérification CRYPTONEO
    const { data: userProfile } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone, gender')
      .eq('id', userId)
      .single() as unknown as { data: { first_name: string; last_name: string; email: string; phone: string; gender: string } | null }

    console.log('[sign] User profile:', userProfile)

    if (userProfile?.email) {
      console.log('[sign] Checking CRYPTONEO for existing alias via email:', userProfile.email)

      const checkRes = await cryptoneoFetch('/generateCert/users')

      if (checkRes.ok) {
        const checkResult: CryptoneoUsersResponse = await checkRes.json()
        console.log('[sign] CRYPTONEO users result:', JSON.stringify(checkResult))
        const user = (checkResult?.data || []).find((u: any) => u.email === userProfile.email)
        const cryptoneoAlias = user?.alias

        if (cryptoneoAlias) {
          console.log('[sign] CRYPTONEO confirmed alias:', cryptoneoAlias)
          aliasCertificat = cryptoneoAlias

          if (alias?.alias_certificat && alias.alias_certificat !== cryptoneoAlias) {
            const sa = supabase.from('signature_aliases') as any
            await sa.delete().eq('user_id', userId).eq('alias_certificat', alias.alias_certificat)
            await sa.insert({
              user_id: userId, alias_certificat: cryptoneoAlias, email: userProfile.email, phone: userProfile.phone, is_active: true,
            })
          }
        } else {
          console.log('[sign] No alias found in CRYPTONEO response')
          if (alias?.alias_certificat) {
            const sa = supabase.from('signature_aliases') as any
            await sa.delete().eq('user_id', userId).eq('alias_certificat', alias.alias_certificat)
          }
        }
      } else {
        const errText = await checkRes.text().catch(() => '')
        console.log('[sign] CRYPTONEO users check failed:', checkRes.status, errText)
      }
    }

    if (!aliasCertificat) {
      console.log('[sign] No alias found, auto-generating certificate for user:', userId)

      if (!userProfile?.first_name || !userProfile?.last_name || !userProfile?.email) {
        console.log('[sign] Cannot auto-generate: incomplete user profile')
        return new Response(JSON.stringify({
          error: 'Profil utilisateur incomplet.',
          needsCertificate: true,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const now = new Date()
      const consentDate = now.toISOString().replace('T', ' ').substring(0, 19)

      const genPayload: Record<string, unknown> = {
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        gender: normalizeCryptoneoGender(userProfile.gender),
        email: userProfile.email,
        phone: userProfile.phone || '',
        organisation: 'MONTOIT',
        consent: true,
        consentDate,
      }

      console.log('[sign] Generating certificate with profile:', { email: userProfile.email })

      const genRes = await cryptoneoFetch('/generateCert/generateCertificat', {
        method: 'POST',
        body: JSON.stringify(genPayload),
      })

      const genText = await genRes.text()
      console.log('[sign] CRYPTONEO generateCertificat response:', { status: genRes.status, body: genText })

      let genResult: CryptoneoCertificatResponse
      try { genResult = JSON.parse(genText) } catch { genResult = {} }

      if (!genRes.ok || !isCryptoneoSuccess(genResult as any) || !genResult?.data?.aliasCertificat) {
        console.log('[sign] Certificate auto-generation failed:', genResult?.statusMessage)
        return new Response(JSON.stringify({
          error: 'Impossible de générer le certificat automatiquement.',
          needsCertificate: true,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      aliasCertificat = genResult.data.aliasCertificat
      console.log('[sign] Certificate auto-generated, alias:', aliasCertificat)

      const sa = supabase.from('signature_aliases') as any
      await sa.insert({
        user_id: userId,
        alias_certificat: aliasCertificat,
        email: userProfile.email,
        phone: userProfile.phone || '',
        is_active: true,
      })
    }

    const { otp, signRequest, callBackUrl } = await req.json()
    console.log('[sign] Request params:', { hasOtp: !!otp, signRequestCount: signRequest?.length, aliasCertificat })

    if (!otp) {
      console.log('[sign] Missing OTP')
      return new Response(JSON.stringify({ error: 'otp is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!Array.isArray(signRequest) || signRequest.length === 0) {
      console.log('[sign] Invalid signRequest')
      return new Response(JSON.stringify({ error: 'signRequest must be a non-empty array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Convertir les items du format Next.js vers le format CRYPTONEO (Postman)
    const convertedItems: SignRequestItem[] = await Promise.all(
      (signRequest as any[]).map(async (item: any) => {
        const base64Data = item.base64?.replace(/^data:application\/pdf;base64,/, '')
        let hashDoc = ''
        try {
          const binaryStr = atob(base64Data || '')
          const bytes = new Uint8Array(binaryStr.length)
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
          const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
          const hashArray = Array.from(new Uint8Array(hashBuffer))
          hashDoc = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        } catch { /* keep empty hash */ }

        // CRYPTONEO a besoin d'une URL HTTP publique accessible depuis ses serveurs
        // (pas de data URL). On utilise l'URL publique du Storage Supabase.
        // En développement local, il faut exposer Supabase via un tunnel (ngrok).
        const itemUrl = item.urlDoc || ''

        console.log('[sign] Sign item:', {
          fileName: item.fileName,
          urlDoc: itemUrl.substring(0, 80) + '...',
          hashDoc: hashDoc.substring(0, 16) + '...',
        })

        return {
          codeDoc: item.fileName || 'document.pdf',
          urlDoc: itemUrl,
          hashDoc,
          visibiliteImage: item.visibleSignature !== false,
          lieuSignature: 'Abidjan',
          motifSignature: `Signature ${item.signatairePrenom || ''} ${item.signataireNom || ''}`.trim(),
        } as SignRequestItem
      })
    )

    const payload: Record<string, unknown> = {
      aliasCertificat,
      otp,
      signRequest: convertedItems,
    }

    if (callBackUrl) payload.callBackUrl = callBackUrl

    // Log du payload (sans base64/hash pour éviter les logs énormes)
    console.log('[sign] CRYPTONEO payload (loggé):', JSON.stringify({
      aliasCertificat,
      otp: otp ? otp.substring(0, 2) + '***' : '(empty)',
      callBackUrl: callBackUrl || '(none)',
      signRequestCount: convertedItems.length,
      signRequest: convertedItems.map(i => ({
        codeDoc: i.codeDoc,
        urlDoc: i.urlDoc ? i.urlDoc.substring(0, 100) + '...' : '(empty!)',
        hashDoc: i.hashDoc ? i.hashDoc.substring(0, 16) + '...' : '(empty)',
        visibiliteImage: i.visibiliteImage,
        lieuSignature: i.lieuSignature,
        motifSignature: i.motifSignature,
      })),
    }, null, 2))

    const { ok, data, error } = await cryptoneoFetchJson('/sign/signFileBatch', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    console.log('[sign] CRYPTONEO signFileBatch response:', { ok, data, error })

    if (!ok) {
      return new Response(JSON.stringify({ error: error || 'Signing failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = data as CryptoneoSignResponse
    console.log('[sign] Sign success:', { operationId: result?.data?.operationId, signedFileName: result?.data?.signedFileName })
    return new Response(JSON.stringify({ operationId: result?.data?.operationId, signedFileName: result?.data?.signedFileName, data: result?.data }), {
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
