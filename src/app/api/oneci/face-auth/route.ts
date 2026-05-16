import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/oneci/face-auth
 *
 * Performs biometric face authentication via the ONECI NEOFACE API.
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

    // Parse request body for face image
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
    try {
      // Convert base64 string to a Blob for FormData
      const imageBuffer = Buffer.from(faceImageBase64, 'base64')
      const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('NNI', user.nni)
      formData.append('FACE_IMAGE', imageBlob, 'face.jpg')

      const faceAuthResponse = await fetch(`${apiUrl}/api/v1/oneci/face-auth`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        body: formData,
      })

      // ── Step 3: Process response ─────────────────────────────────────────
      const responseText = await faceAuthResponse.text()

      // Parse the response
      let responseData: unknown = null
      try {
        responseData = JSON.parse(responseText)
      } catch {
        // Non-JSON response
      }

      // Check for success indicators
      // The API may return a success field, or empty body, or status 200 with match info
      const isSuccess =
        faceAuthResponse.ok &&
        (
          !responseText ||
          responseText.trim() === '' ||
          responseText.trim() === '{}' ||
          (responseData as Record<string, unknown>)?.success === true ||
          (responseData as Record<string, unknown>)?.matched === true ||
          (responseData as Record<string, unknown>)?.match === true
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

      console.error('NEOFACE face-auth error:', faceAuthResponse.status, responseText)

      return NextResponse.json({
        verified: false,
        error: errorMessage || 'La vérification biométrique a échoué. Votre visage ne correspond pas à la photo de votre CNI.',
        rawStatus: faceAuthResponse.status,
      }, { status: 200 }) // Return 200 even on mismatch — it's a valid API result

    } catch (err) {
      console.error('NEOFACE face-auth network error:', err)
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
 * Extract error message from ONECI face-auth response
 */
function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>

  // Check for direct message or error field
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

  return null
}
