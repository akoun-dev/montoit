import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { cryptoneoFetch, cryptoneoFetchJson, isCryptoneoSuccess, normalizeCryptoneoGender, type CryptoneoCertificatResponse, type CryptoneoUser, type CryptoneoUsersResponse } from '../_shared/cryptoneo.ts'

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

    // ── Récupérer les paramètres du body ──
    const { canal, email } = await req.json().catch(() => ({}))

    console.log('[sign-send-otp] Request params:', { canal, email, userId })

    if (!canal || (canal !== 'MAIL' && canal !== 'SMS')) {
      console.log('[sign-send-otp] Invalid canal:', canal)
      return new Response(JSON.stringify({ error: 'canal is required: MAIL or SMS' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let targetUserId = userId
    let targetEmail = email
    let targetPhone = ''

    if (email) {
      console.log('[sign-send-otp] Looking up user by email:', email)
      const { data: userRaw } = await supabase
        .from('users')
        .select('id, phone')
        .eq('email', email)
        .maybeSingle()
      console.log('[sign-send-otp] User lookup result:', userRaw)
      if (userRaw) {
        targetUserId = userRaw.id
        targetPhone = userRaw.phone || ''
      } else {
        console.log('[sign-send-otp] No user found with email:', email)
      }
    } else {
      console.log('[sign-send-otp] No email provided, using current user:', userId)
      const { data: userData } = await supabase
        .from('users')
        .select('email, phone')
        .eq('id', userId)
        .maybeSingle()
      console.log('[sign-send-otp] User data:', userData)
      if (userData) {
        targetEmail = userData.email
        targetPhone = userData.phone || ''
      }
    }

    console.log('[sign-send-otp] Target resolved:', { targetUserId, targetEmail, targetPhone })

    // ── Vérifier l'alias dans la base locale ──
    console.log('[sign-send-otp] Looking up alias for user:', targetUserId)
    const { data: alias } = await supabase
      .from('signature_aliases')
      .select('alias_certificat')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .maybeSingle()

    console.log('[sign-send-otp] Local alias result:', alias)
    let aliasCertificat: string | undefined

    // ── Toujours donner la priorité à CRYPTONEO ──
    // Le local peut contenir des faux alias (local_cert_*), on ne l'utilise
    // que si CRYPTONEO confirme l'avoir.
    if (targetEmail) {
      console.log('[sign-send-otp] Checking CRYPTONEO for real alias via email:', targetEmail)

      const checkRes = await cryptoneoFetch('/generateCert/users')

      if (checkRes.ok) {
        const checkResult: CryptoneoUsersResponse = await checkRes.json()
        const user = (checkResult?.data || []).find((u: any) => u.email === targetEmail)
        const cryptoneoAlias = user?.alias

        if (cryptoneoAlias) {
          console.log('[sign-send-otp] CRYPTONEO confirmed alias:', cryptoneoAlias)
          aliasCertificat = cryptoneoAlias

          // Si l'alias local est différent, le remplacer
          if (alias?.alias_certificat && alias.alias_certificat !== cryptoneoAlias) {
            await supabase.from('signature_aliases').delete().eq('user_id', targetUserId).eq('alias_certificat', alias.alias_certificat)
            await supabase.from('signature_aliases').insert({
              user_id: targetUserId, alias_certificat: cryptoneoAlias, email: targetEmail, phone: targetPhone, is_active: true,
            } as any)
          }
        } else {
          console.log('[sign-send-otp] No alias found in CRYPTONEO for this email')
          // Supprimer le faux alias local s'il existe pour éviter les tentatives échouées
          if (alias?.alias_certificat) {
            console.log('[sign-send-otp] Removing fake local alias:', alias.alias_certificat)
            await supabase.from('signature_aliases').delete().eq('user_id', targetUserId).eq('alias_certificat', alias.alias_certificat)
          }
        }
      } else {
        const errText = await checkRes.text().catch(() => '')
        console.log('[sign-send-otp] CRYPTONEO users check failed:', checkRes.status, errText)
      }
    }

    // Si CRYPTONEO n'a pas confirmé d'alias, auto-générer le certificat

    if (!aliasCertificat) {
      console.log('[sign-send-otp] No alias found, auto-generating certificate for user:', targetUserId)

      // Récupérer le profil complet de l'utilisateur
      const { data: userProfile } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone, gender')
        .eq('id', targetUserId)
        .single() as unknown as { data: { first_name: string; last_name: string; email: string; phone: string; gender: string } | null }

      if (!userProfile?.first_name || !userProfile?.last_name || !userProfile?.email) {
        console.log('[sign-send-otp] Cannot auto-generate: incomplete user profile')
        return new Response(JSON.stringify({
          error: 'Profil utilisateur incomplet. Veuillez compléter vos informations.',
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
        phone: userProfile.phone || targetPhone,
        organisation: 'MONTOIT',
        consent: true,
        consentDate,
      }

      console.log('[sign-send-otp] Generating certificate with profile:', { email: userProfile.email, firstName: userProfile.first_name })

      const genRes = await cryptoneoFetch('/generateCert/generateCertificat', {
        method: 'POST',
        body: JSON.stringify(genPayload),
      })

      const genText = await genRes.text()
      console.log('[sign-send-otp] CRYPTONEO generateCertificat response:', { status: genRes.status, body: genText })

      let genResult: CryptoneoCertificatResponse
      try { genResult = JSON.parse(genText) } catch { genResult = {} }

      if (!genRes.ok || !isCryptoneoSuccess(genResult as any) || !genResult?.data?.aliasCertificat) {
        console.log('[sign-send-otp] Certificate generation failed:', genResult?.statusMessage)
        return new Response(JSON.stringify({
          error: 'Impossible de générer le certificat automatiquement. Veuillez le créer depuis vos paramètres.',
          needsCertificate: true,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      aliasCertificat = genResult.data.aliasCertificat
      console.log('[sign-send-otp] Certificate auto-generated, alias:', aliasCertificat)

      // Sauvegarder dans la base locale
      await supabase.from('signature_aliases').insert({
        user_id: targetUserId,
        alias_certificat: aliasCertificat,
        email: userProfile.email,
        phone: userProfile.phone || targetPhone,
        is_active: true,
      } as any)
    }

    const body: Record<string, string> = {
      aliasCertificat,
      typeOperation: 'SIGNATURE_ELECTRONIQUE',
      canal,
    }

    console.log('[sign-send-otp] Sending OTP to CRYPTONEO:', body)

    const { ok, data, error } = await cryptoneoFetchJson('/otp/send', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    console.log('[sign-send-otp] CRYPTONEO /otp/send response:', { ok, data, error })

    if (!ok) {
      console.log('[sign-send-otp] OTP send failed:', error)
      return new Response(JSON.stringify({ error: error || 'Failed to send OTP' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[sign-send-otp] OTP sent successfully')
    return new Response(JSON.stringify({ success: true }), {
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
