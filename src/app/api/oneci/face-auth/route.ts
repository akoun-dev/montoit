import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/oneci/face-auth
 *
 * Performs biometric face authentication via the NEOFACE API.
 *
 * Flow:
 * 1. Get user session from cookie
 * 2. Validate user has NNI and is ONECI-verified
 * 3. Upload selfie to NEOFACE /document_capture → get document_id
 * 4. Call NEOFACE /match_verify with document_id to check match
 * 5. If matched → update neofaceVerified = true, neofaceVerifiedAt = now()
 *
 * The NEOFACE token is used in BOTH FormData (as "token" field) AND Authorization header.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get('montoit-user-id')?.value
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Get user from DB
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nni: true,
        oneciVerified: true,
        neofaceVerified: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Must be ONECI-verified first
    if (!user.oneciVerified) {
      return NextResponse.json(
        { error: 'Vérifiez d\'abord votre CNI via ONECI avant la vérification biométrique.' },
        { status: 400 }
      )
    }

    // Must have NNI
    if (!user.nni) {
      return NextResponse.json(
        { error: 'Votre NNI n\'est pas renseigné. Vérifiez d\'abord votre CNI via ONECI.' },
        { status: 400 }
      )
    }

    // Parse request body for face image (base64)
    const body = await req.json().catch(() => ({}))
    const faceImageBase64 = body.faceImage as string | undefined

    if (!faceImageBase64) {
      return NextResponse.json(
        { error: 'L\'image du visage est requise.' },
        { status: 400 }
      )
    }

    // ── NEOFACE API Configuration ────────────────────────────────────────────
    const neofaceApiBase = process.env.NEOFACE_API_BASE
    const neofaceToken = process.env.NEOFACE_BEARER_TOKEN

    if (!neofaceApiBase || !neofaceToken) {
      console.error('NEOFACE API not configured')
      return NextResponse.json(
        { error: 'Service NEOFACE non configuré. Veuillez contacter l\'administrateur.' },
        { status: 503 }
      )
    }

    // ── Step 1: Upload selfie to NEOFACE /document_capture ──────────────────
    let documentId: string
    try {
      // Convert base64 to Buffer then to Blob for FormData
      const imageBuffer = Buffer.from(faceImageBase64, 'base64')
      const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('token', neofaceToken)
      formData.append('doc_file', imageBlob, 'selfie.jpg')

      const uploadResponse = await fetch(`${neofaceApiBase}/document_capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${neofaceToken}`,
        },
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('NEOFACE document_capture error:', uploadResponse.status, errorText)
        return NextResponse.json(
          { error: 'Erreur lors de l\'envoi de la photo au service NEOFACE. Veuillez réessayer.' },
          { status: 502 }
        )
      }

      const uploadData = await uploadResponse.json()
      documentId = uploadData.document_id || uploadData.documentId || uploadData.id || uploadData.doc_id

      if (!documentId) {
        console.error('NEOFACE document_capture: no document_id in response', uploadData)
        return NextResponse.json(
          { error: 'Réponse inattendue du service NEOFACE. Veuillez réessayer.' },
          { status: 502 }
        )
      }

      console.log('NEOFACE document uploaded, document_id:', documentId)
    } catch (err) {
      console.error('NEOFACE document_capture network error:', err)
      return NextResponse.json(
        { error: 'Impossible de joindre le service NEOFACE. Veuillez réessayer.' },
        { status: 503 }
      )
    }

    // ── Step 2: Verify match with /match_verify ────────────────────────────
    try {
      // Poll for verification result (may take a few seconds)
      const maxAttempts = 10
      const pollInterval = 3000 // 3 seconds

      let verified = false
      let matchResult: Record<string, unknown> | null = null

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const verifyResponse = await fetch(`${neofaceApiBase}/match_verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${neofaceToken}`,
          },
          body: JSON.stringify({
            token: neofaceToken,
            document_id: documentId,
          }),
        })

        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text()
          console.error('NEOFACE match_verify error:', verifyResponse.status, errorText)
          // If it's a transient error, keep polling
          if (verifyResponse.status >= 500 && attempt < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval))
            continue
          }
          return NextResponse.json(
            { error: 'Erreur lors de la vérification biométrique. Veuillez réessayer.' },
            { status: 502 }
          )
        }

        const verifyData = await verifyResponse.json()
        matchResult = verifyData as Record<string, unknown>

        // Check for various success indicators
        const status = verifyData.status || verifyData.state || verifyData.result
        const isMatch = verifyData.match === true || verifyData.matched === true || verifyData.verified === true
        const isPending = status === 'pending' || status === 'processing' || status === 'PENDING' || status === 'PROCESSING'

        if (isMatch || (typeof status === 'string' && status.toLowerCase() === 'matched') || (typeof status === 'string' && status.toLowerCase() === 'verified')) {
          verified = true
          break
        }

        if (isPending && attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval))
          continue
        }

        // If we got a definitive non-match result, stop polling
        if (!isPending) {
          break
        }
      }

      if (verified) {
        // ✅ Face matched → verified
        await db.user.update({
          where: { id: userId },
          data: {
            neofaceVerified: true,
            neofaceVerifiedAt: new Date(),
          },
        })

        return NextResponse.json({
          verified: true,
          message: 'Vérification biométrique réussie ! Votre visage a été authentifié avec succès.',
        })
      }

      // Face didn't match or inconclusive
      const errorMessage = extractErrorMessage(matchResult)
      console.error('NEOFACE match_verify: not matched', matchResult)

      return NextResponse.json({
        verified: false,
        error: errorMessage || 'La vérification biométrique a échoué. Votre visage ne correspond pas à la photo de votre CNI.',
      }, { status: 200 }) // Return 200 even on mismatch — it's a valid API result

    } catch (err) {
      console.error('NEOFACE match_verify network error:', err)
      return NextResponse.json(
        { error: 'Impossible de joindre le service de vérification biométrique. Veuillez réessayer.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('NEOFACE face-auth error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Extract error message from NEOFACE API response
 */
function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>

  if (typeof obj.message === 'string') return obj.message
  if (typeof obj.error === 'string') return obj.error

  // Check for errors array
  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    return obj.errors
      .map((e: unknown) => (e as Record<string, unknown>)?.message || (e as Record<string, unknown>)?.msg || String(e))
      .filter(Boolean)
      .join(', ')
  }

  // Check for nested error
  if (obj.error && typeof obj.error === 'object') {
    const errObj = obj.error as Record<string, unknown>
    if (typeof errObj.message === 'string') return errObj.message
  }

  // Check for detail/details field
  if (typeof obj.detail === 'string') return obj.detail
  if (typeof obj.details === 'string') return obj.details

  return null
}
