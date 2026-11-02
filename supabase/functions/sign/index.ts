import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { cryptoneoFetchJson, getCryptoneoToken, isCryptoneoSuccess, type CryptoneoSignResponse, type CryptoneoUsersResponse, type SignRequestItem } from '../_shared/cryptoneo.ts'

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

    const DEFAULT_IMG_URL = 'https://wvqxmdmzyinlpmhtfhrc.supabase.co/storage/v1/object/public/lease-documents/signature_transparent.png'
    const DEFAULT_IMG_HASH = 'cdb30873bdf16770bfea1fe86e44db7476e504c2dca1542b0660b20f47f523a7'

    const supabase = getSupabaseAdminClient()
    const { otp, signRequest, callBackUrl } = await req.json()

    if (!otp) {
      return new Response(JSON.stringify({ error: 'otp is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!Array.isArray(signRequest) || signRequest.length === 0) {
      return new Response(JSON.stringify({ error: 'signRequest must be a non-empty array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Resolve alias ──
    const { data: alias } = await supabase
      .from('signature_aliases')
      .select('alias_certificat')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    let aliasCertificat = alias?.alias_certificat

    if (!aliasCertificat) {
      // Not in DB — search CRYPTONEO by email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email, phone')
        .eq('id', userId)
        .single() as unknown as { data: { email: string; phone: string } | null }

      if (userProfile?.email) {
        const checkRes = await fetch(
          `${Deno.env.get('CRYPTONEO_API_URL') || 'https://ansut.cryptoneoplatforms.com/esignaturedemo'}/generateCert/users?onlyAlias=`,
          { headers: { Authorization: `Bearer ${await getCryptoneoToken()}` } }
        )
        if (checkRes.ok) {
          const checkResult: CryptoneoUsersResponse = await checkRes.json()
          const user = (checkResult?.data || []).find((u: any) => u.email === userProfile.email)
          if (user?.alias) {
            aliasCertificat = user.alias
            const sa = supabase.from('signature_aliases') as any
            await sa.upsert({ user_id: userId, alias_certificat: aliasCertificat, email: userProfile.email, phone: userProfile.phone || '', is_active: true })
          }
        }
      }
    }

    if (!aliasCertificat) {
      return new Response(JSON.stringify({ error: 'Aucun certificat trouvé. Générez-en un d\'abord.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build signRequest items (minimal)
    const convertedItems: SignRequestItem[] = (signRequest as any[]).map((item: any) => ({
      codeDoc: item.fileName || 'document.pdf',
      urlDoc: item.urlDoc || '',
      hashDoc: item.hashDoc || '',
      visibiliteImage: false,
      urlImage: item.urlImage || DEFAULT_IMG_URL,
      hashImage: item.hashImage || DEFAULT_IMG_HASH,
      positionImage: '0,0',
      pageImage: '1',
      messageImage: 'false',
      lieuSignature: 'Abidjan',
      motifSignature: item.motifSignature || `Signature ${item.signatairePrenom || ''} ${item.signataireNom || ''}`.trim(),
    }))

    const PARTNER_CALLBACK_URL = 'https://partners.cryptoneoplatforms.com/electronicsignature/sign/callBack'

    const signPayload: Record<string, unknown> = { aliasCertificat, otp, signRequest: convertedItems, callBackUrl: PARTNER_CALLBACK_URL }

    const bodyStr = JSON.stringify(signPayload)

    const { ok, data: signData, error: signError } = await cryptoneoFetchJson('/sign/signFileBatch', {
      method: 'POST',
      body: bodyStr,
    })

    if (!ok) {
      return new Response(JSON.stringify({ error: signError || 'signFileBatch failed', cryptoneoResponse: signData }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = signData as CryptoneoSignResponse
    const operationId = result?.data?.operationId
    if (!operationId) {
      return new Response(JSON.stringify({ error: 'CRYPTONEO n\'a pas retourné d\'operationId', cryptoneoResponse: signData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Poll verifySignedBatch
    let signedFileName: string | undefined
    for (let attempt = 1; attempt <= 15; attempt++) {
      await new Promise(r => setTimeout(r, 2000))
      const { ok: vOk, data: vData } = await cryptoneoFetchJson('/sign/verifySignedBatch', {
        method: 'POST',
        body: JSON.stringify({ operationId }),
      })
      if (vOk) {
        const results = (vData as any)?.data?.results
        if (Array.isArray(results) && results.length > 0) {
          const fileName = results[0]?.data?.fileName
          if (fileName) {
            signedFileName = fileName
            break
          }
        }
      }
    }

    if (!signedFileName) {
      return new Response(JSON.stringify({ error: 'La signature n\'a pas abouti dans le délai imparti', operationId }), {
        status: 504,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Download signed file
    const token = await getCryptoneoToken()
    const CRYPTONEO_API_URL = Deno.env.get('CRYPTONEO_API_URL') || 'https://ansut.cryptoneoplatforms.com/esignaturedemo'
    const fileRes = await fetch(`${CRYPTONEO_API_URL}/sign/getSignedFile/${encodeURIComponent(signedFileName)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!fileRes.ok) {
      return new Response(JSON.stringify({ error: 'Impossible de télécharger le fichier signé', signedFileName }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const fileBuffer = await fileRes.arrayBuffer()

    // Upload signed PDF to Storage
    const storagePath = `signed/${signedFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadError } = await supabase
      .storage
      .from('lease-documents')
      .upload(storagePath, new Uint8Array(fileBuffer), {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      return new Response(JSON.stringify({ error: 'Échec du stockage du fichier signé' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { publicUrl } } = supabase
      .storage
      .from('lease-documents')
      .getPublicUrl(storagePath)

    return new Response(JSON.stringify({
      operationId,
      signedFileName,
      contractUrl: publicUrl,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
