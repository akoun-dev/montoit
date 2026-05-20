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

    const { data: lease } = await (supabase
      .from('leases')
      .select('id, status, tenant_id, owner_id, tenant:tenant_id(id, first_name, last_name, email), owner:owner_id(id, first_name, last_name, email), property:property_id(id, title)')
      .eq('id', id)
      .maybeSingle() as any)

    if (!lease) {
      const resp = NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      return applyCookies(resp)
    }

    if (lease.tenant_id !== userId && lease.owner_id !== userId) {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    if (lease.status !== 'PENDING_SIGNATURE') {
      const resp = NextResponse.json(
        { error: 'Ce bail ne peut pas être signé (statut: ' + lease.status + ')' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    const isOwner = lease.owner_id === userId
    const alreadySigned = isOwner ? !!lease.owner_signed_at : !!lease.tenant_signed_at
    if (alreadySigned) {
      const resp = NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
      return applyCookies(resp)
    }

    // Récupérer l'email du destinataire
    let recipientEmail = ''
    
    if (isOwner) {
      recipientEmail = lease.owner?.email || ''
    } else {
      // Pour le locataire, utiliser son email depuis les données du bail
      recipientEmail = lease.tenant?.email || ''
    }

    if (!recipientEmail) {
      const resp = NextResponse.json(
        { error: 'Email du destinataire introuvable' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    // Envoyer l'OTP via CRYPTONEO
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sign-send-otp`
    const bearerToken = accessToken || process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('[request-sign-otp] Calling sign-send-otp:', { canal: 'MAIL', email: recipientEmail, userId, isOwner, leaseId: id })

    const otpRes = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
        ...(accessToken ? {} : { 'x-user-id': userId }),
      },
      body: JSON.stringify({
        canal: 'MAIL',
        email: recipientEmail, // Spécifier l'email du destinataire
      }),
    })

    const otpResponseBody = await otpRes.text()
    console.log('[request-sign-otp] sign-send-otp response:', { status: otpRes.status, body: otpResponseBody })

    if (!otpRes.ok) {
      let errData: Record<string, unknown> = { error: 'Erreur CRYPTONEO' }
      try { errData = JSON.parse(otpResponseBody) } catch { /* ignore */ }
      const resp = NextResponse.json(
        { error: errData.error || 'Erreur lors de l\'envoi de l\'OTP CRYPTONEO' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    const resp = NextResponse.json({
      message: isOwner
        ? 'Un code OTP vous a été envoyé par email. Vérifiez votre boîte de réception.'
        : 'Code de vérification envoyé.',
      sentTo: recipientEmail,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Request sign OTP error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}