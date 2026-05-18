import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'

const NEOFACE_BASE_URL = (Deno.env.get('NEOFACE_API_BASE') || 'https://neoface.aineo.ai') + '/api/v2'
const NEOFACE_TIMEOUT = 15_000

async function neofaceFetch(path: string, options: RequestInit): Promise<Response> {
  const token = Deno.env.get('NEOFACE_BEARER_TOKEN')
  if (!token) {
    throw new Error('NEOFACE_BEARER_TOKEN not configured')
  }
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), NEOFACE_TIMEOUT)
  try {
    return await fetch(`${NEOFACE_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
  } finally {
    clearTimeout(id)
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

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

    const { data: dbUser } = await supabase
      .from('users')
      .select('neoface_verified')
      .eq('id', user.id)
      .maybeSingle()

    if (dbUser?.neoface_verified) {
      return new Response(JSON.stringify({ error: 'User already verified' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { mode, docFile, documentId } = await req.json()

    if (!mode || !['upload', 'verify'].includes(mode)) {
      return new Response(JSON.stringify({ error: 'mode must be "upload" or "verify"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (mode === 'upload') {
      if (!docFile) {
        return new Response(JSON.stringify({ error: 'docFile base64 string is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const imageBytes = base64ToUint8Array(docFile)
      const blob = new Blob([imageBytes], { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('doc_file', blob, 'document.jpg')

      let neofaceRes: Response
      try {
        neofaceRes = await neofaceFetch('/document_capture', { method: 'POST', body: formData })
      } catch (fetchErr) {
        const message = fetchErr instanceof Error ? fetchErr.message : 'Request failed'
        if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
          return new Response(JSON.stringify({ error: 'NeoFace request timed out' }), {
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ error: message }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!neofaceRes.ok) {
        const errText = await neofaceRes.text().catch(() => '')
        return new Response(JSON.stringify({ error: `NeoFace upload failed (${neofaceRes.status}): ${errText}` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const neofaceData = await neofaceRes.json()
      const newDocumentId = neofaceData?.document_id

      if (!newDocumentId) {
        return new Response(JSON.stringify({ error: 'NeoFace did not return a document_id' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await supabase.from('users').update({ kyc_document_id: newDocumentId }).eq('id', user.id)

      return new Response(JSON.stringify({ documentId: newDocumentId, selfieUrl: neofaceData?.selfie_url || null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (mode === 'verify') {
      if (!documentId) {
        return new Response(JSON.stringify({ error: 'documentId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let neofaceRes: Response
      try {
        neofaceRes = await neofaceFetch('/match_verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: documentId }),
        })
      } catch (fetchErr) {
        const message = fetchErr instanceof Error ? fetchErr.message : 'Request failed'
        if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
          return new Response(JSON.stringify({ error: 'NeoFace request timed out' }), {
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ error: message }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!neofaceRes.ok) {
        const errText = await neofaceRes.text().catch(() => '')
        return new Response(JSON.stringify({ error: `NeoFace verify failed (${neofaceRes.status}): ${errText}` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const neofaceData = await neofaceRes.json()

      if (neofaceData?.status === 'verified') {
        await supabase.from('users').update({
          neoface_verified: true,
          neoface_verified_at: new Date().toISOString(),
          kyc_document_id: null,
        }).eq('id', user.id)

        return new Response(JSON.stringify({
          status: 'verified',
          verified: true,
          matchingScore: neofaceData?.matching_score || neofaceData?.score || null,
          message: neofaceData?.message || 'Face verified successfully',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (neofaceData?.status === 'failed') {
        await supabase.from('users').update({ kyc_document_id: null }).eq('id', user.id)

        return new Response(JSON.stringify({
          status: 'failed',
          verified: false,
          message: neofaceData?.message || 'Face verification failed',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        status: 'waiting',
        verified: false,
        message: 'Verification pending',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid mode' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
