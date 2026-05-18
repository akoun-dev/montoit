import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'
import { oneciFaceAuth, ONECI_API_KEY, ONECI_SECRET_KEY } from '@/lib/oneci'

/**
 * ONECI Face Authentication
 * POST /api/kyc/oneci/face-auth
 *
 * Performs face authentication against the national ID photo stored in the
 * ONECI database. The user provides their NNI and a base64-encoded selfie.
 *
 * Body: { nni, faceImage }
 * - nni: National ID number
 * - faceImage: base64-encoded image of the user's face
 *
 * On successful authentication, updates user.oneciVerified = true and user.oneciVerifiedAt = now.
 */
export async function POST(req: NextRequest) {
  try {
    // ─── Authentication ───────────────────────────────────────────────────
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // ─── Check ONECI config ───────────────────────────────────────────────
    if (!ONECI_API_KEY || !ONECI_SECRET_KEY) {
      console.error('[ONECI] API credentials not configured')
      return NextResponse.json(
        { error: 'Service de vérification ONECI non configuré. Veuillez contacter l\'administrateur.' },
        { status: 503 },
      )
    }

    // ─── Fetch user ──────────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, oneciVerified: true, nni: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    if (user.oneciVerified) {
      return NextResponse.json(
        { error: 'Vous êtes déjà vérifié ONECI.' },
        { status: 400 },
      )
    }

    // ─── Validate request body ───────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const nni = (body.nni as string | undefined) || user.nni
    const faceImage = body.faceImage as string | undefined

    if (!nni) {
      return NextResponse.json(
        { error: 'Le numéro national d\'identification (NNI) est requis.' },
        { status: 400 },
      )
    }

    if (!faceImage) {
      return NextResponse.json(
        { error: 'L\'image du visage (faceImage) est requise en base64.' },
        { status: 400 },
      )
    }

    // Basic validation: faceImage should be a non-trivial base64 string
    if (faceImage.length < 100) {
      return NextResponse.json(
        { error: 'L\'image fournie est trop petite. Veuillez fournir une image valide.' },
        { status: 400 },
      )
    }

    // ─── Call ONECI Face Auth API ────────────────────────────────────────
    try {
      console.log('[ONECI] Calling face auth for NNI:', nni)
      const authResult = await oneciFaceAuth({
        nni,
        faceImage,
      })

      const isAuthenticated = authResult.authenticated === true || authResult.data?.authenticated === true

      if (isAuthenticated) {
        // Update user record with ONECI verification
        await db.user.update({
          where: { id: userId },
          data: {
            oneciVerified: true,
            oneciVerifiedAt: new Date(),
            nni,
          },
        })

        console.log('[ONECI] Face auth successful for user:', userId)

        return NextResponse.json({
          authenticated: true,
          score: authResult.score ?? null,
          message: authResult.message || 'Authentification faciale réussie ! Votre visage correspond à la photo de la carte nationale d\'identité.',
        })
      }

      // Authentication failed
      console.log('[ONECI] Face auth failed for NNI:', nni, 'Score:', authResult.score)

      return NextResponse.json({
        authenticated: false,
        score: authResult.score ?? null,
        message: authResult.message || 'L\'authentification faciale a échoué. Le visage ne correspond pas à la photo de la carte nationale d\'identité.',
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.error('[ONECI] Face auth timed out')
        return NextResponse.json(
          { error: 'Le service ONECI met trop de temps à répondre. Veuillez réessayer.' },
          { status: 504 },
        )
      }

      console.error('[ONECI] Face auth API error:', err)
      return NextResponse.json(
        { error: 'Erreur lors de la communication avec le service ONECI. Veuillez réessayer.' },
        { status: 502 },
      )
    }
  } catch (error) {
    console.error('[ONECI] face-auth route error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
