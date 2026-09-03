import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { rnppPersonMatch, RnppApiError } from '@/lib/oneci'

// Kept as a compatibility route for existing clients. All calls now use RNPP Connect.
export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    const supabase = getSupabaseAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, last_name, gender, birth_date, nni, oneci_verified')
      .eq('id', userId)
      .single()
    if (!user) return NextResponse.json({ message: 'Utilisateur non trouvé' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const nni = String(body.nni || user.nni || '').trim()
    const birthDate = String(body.birthDate || user.birth_date || '').slice(0, 10)
    const genderMap: Record<string, string> = { M: 'M', F: 'F', HOMME: 'M', FEMME: 'F' }
    const gender = genderMap[String(user.gender || '').toUpperCase()]
    if (!nni) return NextResponse.json({ message: 'Le NNI est requis' }, { status: 400 })
    if (!user.first_name || !user.last_name) return NextResponse.json({ message: 'Votre nom et prénom doivent être renseignés dans votre profil' }, { status: 400 })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return NextResponse.json({ message: 'La date de naissance doit être au format YYYY-MM-DD' }, { status: 400 })
    if (!['M', 'F'].includes(gender)) return NextResponse.json({ message: 'Le genre doit être M ou F pour la vérification RNPP' }, { status: 400 })

    const result = await rnppPersonMatch({
      nni,
      firstName: user.first_name,
      lastName: user.last_name,
      birthDate,
      gender,
    })
    const verified = result.match === true
    if (verified) {
      await supabase.from('users').update({
        oneci_verified: true,
        oneci_verified_at: new Date().toISOString(),
        nni,
        birth_date: birthDate,
      }).eq('id', userId)
    }

    const response = NextResponse.json({
      verified,
      match: verified,
      score: result.score ?? null,
      message: result.message || (verified ? 'Vérification RNPP réussie.' : 'Les informations ne correspondent pas à votre NNI.'),
    }, { status: 200 })
    return applyCookies(response)
  } catch (error) {
    if (error instanceof RnppApiError) {
      const response = NextResponse.json(error.body || { message: error.message }, { status: error.status })
      if (error.retryAfter) response.headers.set('Retry-After', error.retryAfter)
      return response
    }
    console.error('[RNPP] Verify error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 502 })
  }
}
