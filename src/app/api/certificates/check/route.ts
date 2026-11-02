import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getEdgeFunctionBearerToken } from '@/lib/get-edge-function-bearer-token'

interface SignatureAlias {
  alias_certificat: string
  email: string | null
  phone: string | null
  is_active: boolean
}

export async function GET(req: NextRequest) {
  try {
    const { userId, accessToken, authSource, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const phone = searchParams.get('phone')
    const alias = searchParams.get('alias')

    if (!email && !phone && !alias) {
      const resp = NextResponse.json({ error: 'email, téléphone ou alias requis' }, { status: 400 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    // Check if user already has an active certificate in our database
    const { data: existingAlias } = await supabase
      .from('signature_aliases')
      .select('alias_certificat, email, phone, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle() as unknown as { data: SignatureAlias | null }

    if (existingAlias?.alias_certificat) {
      const resp = NextResponse.json({
        hasCertificate: true,
        alias: existingAlias.alias_certificat,
        storedLocally: true,
        data: {
          email: existingAlias.email,
          phone: existingAlias.phone,
        },
      })
      return applyCookies(resp)
    }

    // Check CRYPTONEO for existing certificate
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-certificate`
    const bearerToken = getEdgeFunctionBearerToken(accessToken, authSource)
    if (!bearerToken) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const checkUrl = new URL(functionUrl)
    if (email) checkUrl.searchParams.set('email', email)
    if (phone) checkUrl.searchParams.set('phone', phone)
    if (alias) checkUrl.searchParams.set('alias', alias)

    const checkRes = await fetch(checkUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        ...(accessToken ? {} : { 'x-user-id': userId }),
      },
    })

    if (!checkRes.ok) {
      const errData = await checkRes.json().catch(() => ({}))
      const resp = NextResponse.json({
        error: errData.error || 'Erreur lors de la vérification du certificat',
      }, { status: checkRes.status })
      return applyCookies(resp)
    }

    const checkResult = await checkRes.json()

    const resp = NextResponse.json({
      hasCertificate: checkResult.hasCertificate,
      alias: checkResult.alias,
      storedLocally: checkResult.storedLocally || false,
      synced: checkResult.synced || false,
      data: checkResult.data,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Certificate check error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}
