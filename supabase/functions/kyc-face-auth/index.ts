import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'

const NEOFACE_API_BASE = Deno.env.get('NEOFACE_API_BASE')
const NEOFACE_BASE_URL = NEOFACE_API_BASE || 'https://neoface.aineo.ai/api/v2'
const NEOFACE_TIMEOUT = 30_000

// Optimisation d'image pour éviter les erreurs 413
async function optimizeImage(imageData: Uint8Array): Promise<Blob> {
  try {
    const originalBlob = new Blob([imageData])

    // Si l'image est déjà de taille raisonnable
    if (originalBlob.size <= 2 * 1024 * 1024) { // 2MB
      return originalBlob
    }

    // Compression adaptative - retourne le blob avec quality réduite
    // Note: Deno ne supporte pas canvas/image compression native
    // Nous gardons le blob original mais avertissons si > 10MB
    if (originalBlob.size > 10 * 1024 * 1024) {
      throw new Error(`Image trop volumineuse: ${(originalBlob.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`)
    }

    return originalBlob
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    return new Blob([imageData], { type: 'image/jpeg' })
  }
}

// Logging des appels API
async function logServiceUsage(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  data: {
    serviceName: string
    provider: string
    status: 'success' | 'failure' | 'pending'
    errorMessage?: string | null
    responseTimeMs: number
    userId?: string
  }
) {
  try {
    await supabase.from('service_usage_logs').insert({
      service_name: data.serviceName,
      provider: data.provider,
      status: data.status,
      error_message: data.errorMessage || null,
      response_time_ms: data.responseTimeMs,
      timestamp: new Date().toISOString(),
      user_id: data.userId || null,
    })
  } catch (logErr) {
    console.error('[NeoFace] Failed to log service usage:', logErr)
  }
}

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

function parseDateNaissance(ddmmyyyy: string): string | null {
  if (!ddmmyyyy) return null
  const parts = ddmmyyyy.split('/')
  if (parts.length !== 3) return null
  return `${parts[2]}-${parts[1]}-${parts[0]}`
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

    const userId = await resolveUserFromRequest(req)
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = getSupabaseAdminClient()
    const { mode, docFile, docFileVerso, documentId } = await req.json()

    if (!mode || !['upload', 'verify', 'reset'].includes(mode)) {
      return new Response(JSON.stringify({ error: 'mode must be "upload", "verify" or "reset"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (mode === 'reset') {
      await supabase.from('users').update({
        neoface_verified: false,
        neoface_verified_at: null,
        kyc_document_id: null,
      }).eq('id', userId)

      return new Response(JSON.stringify({ success: true, message: 'KYC verification reset successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (mode === 'upload') {
      const uploadStartTime = Date.now()

      if (!docFile) {
        return new Response(JSON.stringify({ error: 'docFile base64 string is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const imageBytes = base64ToUint8Array(docFile)
      const imageBlob = await optimizeImage(imageBytes)
      const formData = new FormData()
      formData.append('doc_file', imageBlob, 'document.jpg')

      if (docFileVerso) {
        const versoBytes = base64ToUint8Array(docFileVerso)
        const versoBlob = await optimizeImage(versoBytes)
        formData.append('doc_file_verso', versoBlob, 'document_verso.jpg')
      }

      let neofaceRes: Response
      try {
        neofaceRes = await neofaceFetch('/document_capture', { method: 'POST', body: formData })
      } catch (fetchErr) {
        const message = fetchErr instanceof Error ? fetchErr.message : 'Request failed'
        await logServiceUsage(supabase, {
          serviceName: 'face_recognition',
          provider: 'neoface',
          status: 'failure',
          errorMessage: message,
          responseTimeMs: Date.now() - uploadStartTime,
          userId,
        })

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

      // Gestion des erreurs HTTP
      if (!neofaceRes.ok) {
        const errText = await neofaceRes.text().catch(() => '')
        let errorMessage = `NeoFace upload failed (${neofaceRes.status}): ${errText}`

        if (neofaceRes.status === 429) {
          errorMessage = 'Limite de débit NeoFace atteinte, réessayez dans 1 minute'
        } else if (neofaceRes.status === 401) {
          errorMessage = 'Token NeoFace invalide ou expiré'
        }

        await logServiceUsage(supabase, {
          serviceName: 'face_recognition',
          provider: 'neoface',
          status: 'failure',
          errorMessage,
          responseTimeMs: Date.now() - uploadStartTime,
          userId,
        })

        return new Response(JSON.stringify({ error: errorMessage }), {
          status: neofaceRes.status === 429 ? 429 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const neofaceData = await neofaceRes.json()
      const newDocumentId = neofaceData?.document_id

      if (!newDocumentId) {
        await logServiceUsage(supabase, {
          serviceName: 'face_recognition',
          provider: 'neoface',
          status: 'failure',
          errorMessage: 'NeoFace did not return a document_id',
          responseTimeMs: Date.now() - uploadStartTime,
          userId,
        })
        return new Response(JSON.stringify({ error: 'NeoFace did not return a document_id' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Log succès
      await logServiceUsage(supabase, {
        serviceName: 'face_recognition',
        provider: 'neoface',
        status: 'success',
        responseTimeMs: Date.now() - uploadStartTime,
        userId,
      })

      // Créer un enregistrement dans facial_verifications
      const { data: verificationRecord } = await supabase
        .from('facial_verifications')
        .insert({
          user_id: userId,
          provider: 'neoface',
          document_id: newDocumentId,
          selfie_url: neofaceData?.url || null,
          status: 'pending',
          provider_response: neofaceData,
        })
        .select('uuid')
        .single()

      const ocr = neofaceData?.ocr || false
      const ocrNom = neofaceData?.nom?.trim() || null
      const ocrPrenom = neofaceData?.prenom?.trim() || null
      const ocrDateNaissance = neofaceData?.date_naissance?.trim() || null
      const ocrSexe = neofaceData?.sexe?.trim()?.toUpperCase() || null
      const ocrTypeDoc = neofaceData?.type_doc?.trim() || null
      const ocrNumeroDocument = neofaceData?.numero_document?.trim() || null
      const ocrVersoNni = neofaceData?.verso?.nni?.trim() || null
      const ocrVersoProfession = neofaceData?.verso?.profession?.trim() || null

      const updateData: Record<string, unknown> = {
        kyc_document_id: newDocumentId,
      }

      if (ocr) {
        if (ocrPrenom) updateData.first_name = ocrPrenom
        if (ocrNom) updateData.last_name = ocrNom
        if (ocrSexe && ['M', 'F'].includes(ocrSexe)) updateData.gender = ocrSexe
        if (ocrDateNaissance) {
          const parsedDate = parseDateNaissance(ocrDateNaissance)
          if (parsedDate) updateData.birth_date = parsedDate
        }
        if (ocrVersoNni) updateData.nni = ocrVersoNni
      }

      await supabase.from('users').update(updateData).eq('id', userId)

      const selfieUrl = neofaceData?.url || null
      return new Response(JSON.stringify({
        documentId: newDocumentId,
        selfieUrl,
        verificationId: verificationRecord?.uuid || null,
        ocr,
        ocrData: ocr ? {
          typeDoc: ocrTypeDoc,
          nom: ocrNom,
          prenom: ocrPrenom,
          dateNaissance: ocrDateNaissance,
          sexe: ocrSexe,
          numeroDocument: ocrNumeroDocument,
          verso: {
            nni: ocrVersoNni,
            profession: ocrVersoProfession,
          },
        } : null,
      }), {
        status: 201, // 201 Created selon l'API NeoFace
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (mode === 'verify') {
      const verifyStartTime = Date.now()

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
        await logServiceUsage(supabase, {
          serviceName: 'face_recognition',
          provider: 'neoface',
          status: 'failure',
          errorMessage: message,
          responseTimeMs: Date.now() - verifyStartTime,
          userId,
        })

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

      // Gestion des erreurs HTTP
      if (!neofaceRes.ok) {
        const errText = await neofaceRes.text().catch(() => '')
        let errorMessage = `NeoFace verify failed (${neofaceRes.status}): ${errText}`

        if (neofaceRes.status === 429) {
          errorMessage = 'Limite de débit NeoFace atteinte, réessayez dans 1 minute'
        } else if (neofaceRes.status === 401) {
          errorMessage = 'Token NeoFace invalide ou expiré'
        }

        await logServiceUsage(supabase, {
          serviceName: 'face_recognition',
          provider: 'neoface',
          status: 'failure',
          errorMessage,
          responseTimeMs: Date.now() - verifyStartTime,
          userId,
        })

        return new Response(JSON.stringify({ error: errorMessage }), {
          status: neofaceRes.status === 429 ? 429 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const neofaceData = await neofaceRes.json()

      // Mettre à jour facial_verifications avec le résultat final
      if (neofaceData?.status === 'verified' || neofaceData?.status === 'failed') {
        const isVerified = neofaceData.status === 'verified'

        await supabase.from('facial_verifications')
          .update({
            status: isVerified ? 'passed' : 'failed',
            matching_score: neofaceData?.matching_score || null,
            is_match: isVerified,
            is_live: isVerified,
            provider_response: neofaceData,
            failure_reason: isVerified ? null : (neofaceData?.message || null),
            verified_at: new Date().toISOString(),
          })
          .eq('document_id', documentId)
          .eq('user_id', userId)
      }

      if (neofaceData?.status === 'verified') {
        await supabase.from('users').update({
          neoface_verified: true,
          neoface_verified_at: new Date().toISOString(),
          kyc_document_id: null,
        }).eq('id', userId)

        await logServiceUsage(supabase, {
          serviceName: 'face_recognition',
          provider: 'neoface',
          status: 'success',
          responseTimeMs: Date.now() - verifyStartTime,
          userId,
        })

        return new Response(JSON.stringify({
          status: 'verified',
          verified: true,
          matchingScore: neofaceData?.matching_score || neofaceData?.score || null,
          message: neofaceData?.message || 'Face verified successfully',
        }), {
          status: 200, // 200 OK pour verified/failed selon l'API NeoFace
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (neofaceData?.status === 'failed') {
        await supabase.from('users').update({ kyc_document_id: null }).eq('id', userId)

        await logServiceUsage(supabase, {
          serviceName: 'face_recognition',
          provider: 'neoface',
          status: 'failure',
          errorMessage: neofaceData?.message || 'Face verification failed',
          responseTimeMs: Date.now() - verifyStartTime,
          userId,
        })

        return new Response(JSON.stringify({
          status: 'failed',
          verified: false,
          message: neofaceData?.message || 'Face verification failed',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Status waiting - 201 Created selon l'API NeoFace
      await logServiceUsage(supabase, {
        serviceName: 'face_recognition',
        provider: 'neoface',
        status: 'pending',
        responseTimeMs: Date.now() - verifyStartTime,
        userId,
      })

      return new Response(JSON.stringify({
        status: 'waiting',
        verified: false,
        message: 'Verification pending',
      }), {
        status: 201, // 201 Created pour waiting selon l'API NeoFace
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid mode' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[NeoFace] Server error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})