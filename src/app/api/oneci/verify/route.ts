import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

/**
 * POST /api/oneci/verify
 *
 * Verifies the authenticity of user information against the ONECI database
 * using their NNI (Numéro National d'Identification).
 *
 * Flow:
 * 1. Authenticate with ONECI API to get a bearer token
 * 2. Call the match endpoint with NNI + user attributes
 * 3. If API returns empty response → information verified → oneciVerified = true
 * 4. If API returns errors → information doesn't match → return error details
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
        firstName: true,
        lastName: true,
        gender: true,
        birthDate: true,
        nni: true,
        oneciVerified: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Parse request body for optional overrides (nni, birthDate)
    const body = await req.json().catch(() => ({}))
    const nni = body.nni || user.nni
    const birthDate = body.birthDate || user.birthDate

    // Validate required fields
    if (!nni) {
      return NextResponse.json(
        { error: 'Le NNI (Numéro National d\'Identification) est requis' },
        { status: 400 }
      )
    }

    if (!user.firstName || !user.lastName) {
      return NextResponse.json(
        { error: 'Votre nom et prénom doivent être renseignés dans votre profil' },
        { status: 400 }
      )
    }

    if (!birthDate) {
      return NextResponse.json(
        { error: 'Votre date de naissance doit être renseignée dans votre profil' },
        { status: 400 }
      )
    }

    if (!user.gender) {
      return NextResponse.json(
        { error: 'Votre genre doit être renseigné dans votre profil' },
        { status: 400 }
      )
    }

    // Save NNI and birthDate to user profile if provided
    if (body.nni || body.birthDate) {
      await db.user.update({
        where: { id: userId },
        data: {
          ...(body.nni ? { nni: body.nni } : {}),
          ...(body.birthDate ? { birthDate: new Date(body.birthDate) } : {}),
        },
      })
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

    // ── Step 2: Call match endpoint ──────────────────────────────────────────
    // Format birthDate as YYYY-MM-DD
    const bd = new Date(birthDate)
    const formattedBirthDate = `${bd.getFullYear()}-${String(bd.getMonth() + 1).padStart(2, '0')}-${String(bd.getDate()).padStart(2, '0')}`

    // Map gender to ONECI format
    const genderMap: Record<string, string> = {
      M: 'M',
      F: 'F',
      AUTRE: 'M', // Default fallback
    }
    const oneciGender = genderMap[user.gender] || 'M'

    try {
      const formData = new FormData()
      formData.append('FIRST_NAME', user.firstName.toUpperCase())
      formData.append('LAST_NAME', user.lastName.toUpperCase())
      formData.append('BIRTH_DATE', formattedBirthDate)
      formData.append('GENDER', oneciGender)

      const matchResponse = await fetch(`${apiUrl}/api/v1/oneci/persons/${nni}/match`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        body: formData,
      })

      // ── Step 3: Process response ─────────────────────────────────────────
      // Empty response = verified (information matches)
      // Non-empty response with errors = not verified
      const responseText = await matchResponse.text()

      if (!responseText || responseText.trim() === '' || responseText.trim() === '{}') {
        // ✅ Empty response → information verified
        await db.user.update({
          where: { id: userId },
          data: {
            oneciVerified: true,
            oneciVerifiedAt: new Date(),
            nni: nni,
            birthDate: new Date(birthDate),
          },
        })

        return NextResponse.json({
          verified: true,
          message: 'Vérification ONECI réussie ! Votre carte d\'identité nationale a été authentifiée.',
        })
      }

      // Try to parse the error response
      let errorData: unknown = null
      try {
        errorData = JSON.parse(responseText)
      } catch {
        // Non-JSON response
      }

      console.error('ONECI match error:', matchResponse.status, responseText)

      // Extract mismatch details
      const mismatchDetails = extractMismatchDetails(errorData as Record<string, unknown>)

      return NextResponse.json({
        verified: false,
        error: 'Les informations fournies ne correspondent pas à votre NNI.',
        details: mismatchDetails || undefined,
        rawStatus: matchResponse.status,
      }, { status: 200 }) // Return 200 even on mismatch — it's a valid API result

    } catch (err) {
      console.error('ONECI match network error:', err)
      return NextResponse.json(
        { error: 'Impossible de joindre le service de vérification ONECI. Veuillez réessayer.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('ONECI verify error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Extract mismatch details from ONECI error response
 */
function extractMismatchDetails(data: Record<string, unknown>): string | null {
  if (!data) return null

  // ONECI returns an array of mismatched attributes like:
  // [{"AttributeName":"BIRTH_DATE","ErrorCode":"1"}]
  if (Array.isArray(data)) {
    const labels: Record<string, string> = {
      FIRST_NAME: 'Prénom',
      LAST_NAME: 'Nom',
      BIRTH_DATE: 'Date de naissance',
      GENDER: 'Genre',
      BIRTH_TOWN: 'Lieu de naissance',
      BIRTH_COUNTRY: 'Pays de naissance',
      NATIONALITY: 'Nationalité',
    }
    const mismatched = data
      .filter((item) => item.AttributeName || item.name || item.key)
      .map((item) => labels[item.AttributeName || item.name || item.key] || item.AttributeName || item.name || item.key)
      .filter(Boolean)

    if (mismatched.length > 0) {
      return `Champs non correspondants : ${mismatched.join(', ')}`
    }
  }

  // Check for attribute-level errors (alternative format)
  if (data.attributes && Array.isArray(data.attributes)) {
    const mismatched = (data.attributes as Array<Record<string, unknown>>)
      .filter((attr) => attr.match === false || attr.match === 'false')
      .map((attr) => attr.name || attr.key)
      .filter(Boolean)

    if (mismatched.length > 0) {
      const labels: Record<string, string> = {
        FIRST_NAME: 'Prénom',
        LAST_NAME: 'Nom',
        BIRTH_DATE: 'Date de naissance',
        GENDER: 'Genre',
        BIRTH_TOWN: 'Lieu de naissance',
        BIRTH_COUNTRY: 'Pays de naissance',
        NATIONALITY: 'Nationalité',
      }
      return `Champs non correspondants : ${mismatched.map((k) => labels[k as string] || k).join(', ')}`
    }
  }

  // Check for errors array
  if (data.errors && Array.isArray(data.errors)) {
    return (data.errors as Array<Record<string, unknown>>)
      .map((e) => e.message || e.msg || e.error)
      .filter(Boolean)
      .join(', ') || null
  }

  return null
}
