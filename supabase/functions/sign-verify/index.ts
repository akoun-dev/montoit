import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { cryptoneoFetch, type CryptoneoVerifyResponse } from '../_shared/cryptoneo.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'

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

    const { operationId } = await req.json()

    if (!operationId) {
      return new Response(JSON.stringify({ error: 'operationId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Callback CRYPTONEO : vérifier le statut de la signature
    const res = await cryptoneoFetch('/sign/verifySignedBatch', {
      method: 'POST',
      body: JSON.stringify({ operationId }),
    })

    const result: CryptoneoVerifyResponse = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: result?.statusMessage || 'Verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Si la signature est réussie, récupérer le fichier signé
    const results = (result as any)?.data?.results
    const signedFileName = Array.isArray(results) ? results[0]?.data?.fileName : undefined

    if (signedFileName) {
      try {
        const fileRes = await cryptoneoFetch(`/sign/getSignedFile/${encodeURIComponent(signedFileName)}`)
        if (fileRes.ok) {
          const fileBuf = await fileRes.arrayBuffer()
          const supabase = getSupabaseAdminClient()
          const storagePath = `signed/${signedFileName}`
          await supabase.storage.from('lease-documents').upload(
            storagePath,
            new Uint8Array(fileBuf),
            { contentType: 'application/pdf', upsert: true },
          )
        }
      } catch (err) {
        // Échec du téléchargement dans le callback, le polling principal s'en chargera
      }
    }

    return new Response(JSON.stringify({ data: result?.data }), {
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
