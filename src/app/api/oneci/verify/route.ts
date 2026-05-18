import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, last_name, gender, birth_date, nni, oneci_verified')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const nni = body.nni || user.nni
    const birthDate = body.birthDate || user.birth_date

    if (!nni) {
      return NextResponse.json(
        { error: 'Le NNI (Numéro National d\'Identification) est requis' },
        { status: 400 }
      )
    }

    if (!user.first_name || !user.last_name) {
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

    if (body.nni || body.birthDate) {
      const updateData: Record<string, unknown> = {}
      if (body.nni) updateData.nni = body.nni
      if (body.birthDate) updateData.birth_date = new Date(body.birthDate).toISOString()
      await supabase
        .from('users')
        .update(updateData as any)
        .eq('id', userId)
    }

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

    const bd = new Date(birthDate)
    const formattedBirthDate = `${bd.getFullYear()}-${String(bd.getMonth() + 1).padStart(2, '0')}-${String(bd.getDate()).padStart(2, '0')}`

    const genderMap: Record<string, string> = {
      M: 'M',
      F: 'F',
      AUTRE: 'M',
    }
    const oneciGender = genderMap[user.gender] || 'M'

    try {
      const formData = new FormData()
      formData.append('FIRST_NAME', user.first_name.toUpperCase())
      formData.append('LAST_NAME', user.last_name.toUpperCase())
      formData.append('BIRTH_DATE', formattedBirthDate)
      formData.append('GENDER', oneciGender)

      const matchResponse = await fetch(`${apiUrl}/api/v1/oneci/persons/${nni}/match`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        body: formData,
      })

      const responseText = await matchResponse.text()

      if (!responseText || responseText.trim() === '' || responseText.trim() === '{}') {
        await supabase
          .from('users')
          .update({
            oneci_verified: true,
            oneci_verified_at: new Date().toISOString(),
            nni: nni,
            birth_date: new Date(birthDate).toISOString(),
          })
          .eq('id', userId)

        return NextResponse.json({
          verified: true,
          message: 'Vérification ONECI réussie ! Votre carte d\'identité nationale a été authentifiée.',
        })
      }

      let errorData: unknown = null
      try {
        errorData = JSON.parse(responseText)
      } catch {
      }

      console.error('ONECI match error:', matchResponse.status, responseText)

      const mismatchDetails = extractMismatchDetails(errorData as Record<string, unknown>)

      return NextResponse.json({
        verified: false,
        error: 'Les informations fournies ne correspondent pas à votre NNI.',
        details: mismatchDetails || undefined,
        rawStatus: matchResponse.status,
      }, { status: 200 })
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

function extractMismatchDetails(data: Record<string, unknown>): string | null {
  if (!data) return null

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

  if (data.errors && Array.isArray(data.errors)) {
    return (data.errors as Array<Record<string, unknown>>)
      .map((e) => e.message || e.msg || e.error)
      .filter(Boolean)
      .join(', ') || null
  }

  return null
}
