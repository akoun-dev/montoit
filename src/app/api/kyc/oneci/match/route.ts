import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'
import { oneciPersonMatch, ONECI_API_KEY, ONECI_SECRET_KEY } from '@/lib/oneci'

/**
 * ONECI Person Match Verification
 * POST /api/kyc/oneci/match
 *
 * Verifies the user's personal information against the ONECI national ID
 * database using their NNI (Numéro National d'Identification).
 *
 * Body: { nni, firstName, lastName, birthDate, gender }
 * - nni: National ID number
 * - firstName: First name as on ID
 * - lastName: Last name as on ID
 * - birthDate: Birth date in YYYY-MM-DD format
 * - gender: "M" or "F"
 *
 * On successful match, updates user.oneciVerified = true and user.oneciVerifiedAt = now.
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
      select: { id: true, oneciVerified: true, nni: true, firstName: true, lastName: true, gender: true, birthDate: true },
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
    const nni = body.nni as string | undefined
    const firstName = (body.firstName as string | undefined) || user.firstName
    const lastName = (body.lastName as string | undefined) || user.lastName
    const gender = (body.gender as string | undefined) || user.gender
    const birthDate = body.birthDate as string | undefined

    if (!nni) {
      return NextResponse.json(
        { error: 'Le numéro national d\'identification (NNI) est requis.' },
        { status: 400 },
      )
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'Le prénom et le nom sont requis.' },
        { status: 400 },
      )
    }

    if (!gender || (gender !== 'M' && gender !== 'F')) {
      return NextResponse.json(
        { error: 'Le genre est requis (M ou F).' },
        { status: 400 },
      )
    }

    if (!birthDate) {
      return NextResponse.json(
        { error: 'La date de naissance est requise (format YYYY-MM-DD).' },
        { status: 400 },
      )
    }

    // Validate birthDate format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(birthDate)) {
      return NextResponse.json(
        { error: 'Format de date de naissance invalide. Utilisez YYYY-MM-DD.' },
        { status: 400 },
      )
    }

    // ─── Call ONECI Person Match API ─────────────────────────────────────
    try {
      console.log('[ONECI] Calling person match for NNI:', nni)
      const matchResult = await oneciPersonMatch({
        nni,
        firstName,
        lastName,
        birthDate,
        gender,
      })

      const isMatch = matchResult.match === true || matchResult.data?.match === true

      if (isMatch) {
        // Update user record with ONECI verification
        await db.user.update({
          where: { id: userId },
          data: {
            oneciVerified: true,
            oneciVerifiedAt: new Date(),
            nni,
            gender,
            birthDate: new Date(birthDate),
          },
        })

        console.log('[ONECI] Person match successful for user:', userId)

        return NextResponse.json({
          match: true,
          score: matchResult.score ?? null,
          message: matchResult.message || 'Vérification ONECI réussie ! Vos informations correspondent à la carte nationale d\'identité.',
        })
      }

      // No match — do not update verification status
      console.log('[ONECI] Person match failed for NNI:', nni, 'Score:', matchResult.score)

      return NextResponse.json({
        match: false,
        score: matchResult.score ?? null,
        message: matchResult.message || 'Les informations fournies ne correspondent pas à la carte nationale d\'identité. Veuillez vérifier vos données.',
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.error('[ONECI] Person match timed out')
        return NextResponse.json(
          { error: 'Le service ONECI met trop de temps à répondre. Veuillez réessayer.' },
          { status: 504 },
        )
      }

      console.error('[ONECI] Person match API error:', err)
      return NextResponse.json(
        { error: 'Erreur lors de la communication avec le service ONECI. Veuillez réessayer.' },
        { status: 502 },
      )
    }
  } catch (error) {
    console.error('[ONECI] match route error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
