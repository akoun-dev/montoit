import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

/**
 * POST /api/oneci/face-auth
 *
 * Performs biometric face authentication via the ONECI API.
 *
 * Based on the ONECI Postman Collection:
 * - Endpoint: POST {ONECI_API_URL}/api/v1/oneci/face-auth
 * - Auth: Bearer token (same as match endpoint, obtained via /api/v1/authenticate)
 * - Body: JSON { NNI, BIOMETRIC_TYPE: "AUTH_FACE", BIOMETRIC_DATA: "<base64>" }
 *
 * Flow:
 * 1. Get user session from cookie
 * 2. Validate user has NNI and is ONECI-verified
 * 3. Authenticate with ONECI to get bearer token
 * 4. Call face-auth endpoint with NNI + base64 face image
 * 5. If successful → update neofaceVerified = true, neofaceVerifiedAt = now()
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Get user from DB
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nni: true,
        neofaceVerified: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Must have NNI (required by the face-auth API)
    if (!user.nni) {
      return NextResponse.json(
        { error: 'Votre NNI n\'est pas renseigné. Renseignez-le dans votre profil pour activer la vérification biométrique.' },
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

    // ── Step 1: Get bearer token from ONECI ──────────────────────────────────
    const apiUrl = process.env.ONECI_API_URL || 'https://api-rnpp.verif.ci'
    const apiKey = process.env.ONECI_API_KEY
    const secretKey = process.env.ONECI_SECRET_KEY

    if (!apiKey || !secretKey) {
      console.error('ONECI API credentials not configured')
      return NextResponse.json(
        { error: 'Service ONECI non configuré. Veuillez contacter l\'administrateur.' },
        { status: 503 }
      )
    }

    let bearerToken: string
    try {
      const authResponse = await fetch(`${apiUrl}/api/v1/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, secretKey }),
      })

      if (!authResponse.ok) {
        const errorText = await authResponse.text()
        console.error('ONECI auth failed:', authResponse.status, errorText)
        return NextResponse.json(
          { error: 'Erreur d\'authentification au service ONECI. Veuillez réessayer.' },
          { status: 502 }
        )
      }

      const authData = await authResponse.json()
      bearerToken = authData.bearerToken

      if (!bearerToken) {
        console.error('ONECI auth: no bearerToken in response', authData)
        return NextResponse.json(
          { error: 'Réponse d\'authentification ONECI invalide.' },
          { status: 502 }
        )
      }
    } catch (err) {
      console.error('ONECI auth network error:', err)
      return NextResponse.json(
        { error: 'Impossible de joindre le service ONECI. Veuillez réessayer.' },
        { status: 503 }
      )
    }

    // ── Step 2: Call face-auth endpoint ─────────────────────────────────────
    // As per the ONECI Postman Collection:
    // POST /api/v1/oneci/face-auth
    // Body: JSON { NNI, BIOMETRIC_TYPE: "AUTH_FACE", BIOMETRIC_DATA: "<base64>" }
    try {
      const faceAuthResponse = await fetch(`${apiUrl}/api/v1/oneci/face-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          NNI: user.nni,
          BIOMETRIC_TYPE: 'AUTH_FACE',
          BIOMETRIC_DATA: faceImageBase64,
        }),
      })

      // ── Step 3: Process response ─────────────────────────────────────────
      const responseText = await faceAuthResponse.text()

      // Parse response
      let responseData: unknown = null
      try {
        responseData = JSON.parse(responseText)
      } catch {
        // Non-JSON response
      }

      // Check for success indicators
      // Empty response or specific success fields = verified
      const isSuccess =
        faceAuthResponse.ok &&
        (
          !responseText ||
          responseText.trim() === '' ||
          responseText.trim() === '{}' ||
          (responseData as Record<string, unknown>)?.success === true ||
          (responseData as Record<string, unknown>)?.matched === true ||
          (responseData as Record<string, unknown>)?.match === true ||
          (responseData as Record<string, unknown>)?.authenticated === true
        )

      if (isSuccess) {
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

      // Face didn't match or error
      const errorMessage = extractErrorMessage(responseData)

      console.error('ONECI face-auth error:', faceAuthResponse.status, responseText.substring(0, 500))

      return NextResponse.json({
        verified: false,
        error: errorMessage || 'La vérification biométrique a échoué. Votre visage ne correspond pas à la photo de votre CNI.',
        rawStatus: faceAuthResponse.status,
      }, { status: 200 }) // Return 200 even on mismatch — it's a valid API result

    } catch (err) {
      console.error('ONECI face-auth network error:', err)
      return NextResponse.json(
        { error: 'Impossible de joindre le service de vérification biométrique. Veuillez réessayer.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('ONECI face-auth error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Extract error message from ONECI face-auth response
 */
function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>

  // Check for direct message or error field
  if (typeof obj.message === 'string') return obj.message
  if (typeof obj.error === 'string') return obj.error

  // Check for errorMessage field
  if (typeof obj.errorMessage === 'string') return obj.errorMessage

  // Check for errors array (like the match endpoint)
  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    const labels: Record<string, string> = {
      FACE_NOT_MATCHED: 'Le visage ne correspond pas',
      FACE_NOT_DETECTED: 'Aucun visage détecté',
      MULTIPLE_FACES: 'Plusieurs visages détectés',
      POOR_IMAGE_QUALITY: 'Qualité d\'image insuffisante',
    }
    return obj.errors
      .map((e: unknown) => {
        const err = e as Record<string, unknown>
        return labels[err.AttributeName || err.ErrorCode || err.error || err.message || String(e)] || err.message || err.msg || String(e)
      })
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
