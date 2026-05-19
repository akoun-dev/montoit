import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { getCryptoneoToken } from '../_shared/cryptoneo.ts'

const CRYPTONEO_API_URL = Deno.env.get('CRYPTONEO_API_URL') || 'https://signature.ansut.ci'

serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    if (req.method !== 'GET') {
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

    const url = new URL(req.url)
    const fileName = url.searchParams.get('fileName')

    if (!fileName) {
      return new Response(JSON.stringify({ error: 'fileName query parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = await getCryptoneoToken()
    const fileUrl = `${CRYPTONEO_API_URL}/sign/getSignedFile?fileName=${encodeURIComponent(fileName)}`

    const fileRes = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!fileRes.ok) {
      const errText = await fileRes.text().catch(() => '')
      return new Response(JSON.stringify({ error: `Failed to fetch signed file (${fileRes.status}): ${errText}` }), {
        status: fileRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const blob = await fileRes.blob()
    const contentType = fileRes.headers.get('content-type') || 'application/octet-stream'

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        ...corsHeaders,
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
