import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, accessToken, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: mandat } = await supabase
      .from('mandats')
      .select('id, status, owner_id, agency_id, owner:owner_id(id, first_name, last_name, email), agency:agency_id(id, first_name, last_name, email), property:property_id(id, title)')
      .eq('id', id)
      .maybeSingle() as any

    if (!mandat) {
      const resp = NextResponse.json({ error: 'Mandat introuvable' }, { status: 404 })
      return applyCookies(resp)
    }

    if (mandat.owner_id !== userId) {
      const resp = NextResponse.json({ error: 'Seul le propriétaire peut demander un OTP' }, { status: 403 })
      return applyCookies(resp)
    }

    if (mandat.status !== 'DRAFT' && mandat.status !== 'PENDING_SIGNATURE') {
      const resp = NextResponse.json(
        { error: 'Ce mandat ne peut plus être signé' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    if (mandat.owner_signed_at) {
      const resp = NextResponse.json({ error: 'Vous avez déjà signé ce mandat' }, { status: 400 })
      return applyCookies(resp)
    }

    const recipientEmail = mandat.owner?.email || ''
    if (!recipientEmail) {
      const resp = NextResponse.json({ error: 'Email introuvable' }, { status: 400 })
      return applyCookies(resp)
    }

    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sign-send-otp`
    const bearerToken = accessToken || process.env.SUPABASE_SERVICE_ROLE_KEY

    const otpRes = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
        ...(accessToken ? {} : { 'x-user-id': userId }),
      },
      body: JSON.stringify({
        canal: 'MAIL',
        email: recipientEmail,
      }),
    })

    const otpResponseBody = await otpRes.text()

    if (!otpRes.ok) {
      let errData: Record<string, unknown> = { error: 'Erreur CRYPTONEO' }
      try { errData = JSON.parse(otpResponseBody) } catch { }
      const resp = NextResponse.json(
        { error: errData.error || 'Erreur lors de l\'envoi de l\'OTP' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    const resp = NextResponse.json({
      message: 'Un code OTP vous a été envoyé par email.',
      sentTo: recipientEmail,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Request sign OTP error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}
