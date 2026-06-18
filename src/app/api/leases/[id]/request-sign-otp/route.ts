import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getEdgeFunctionBearerToken } from '@/lib/get-edge-function-bearer-token'


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, accessToken, authSource, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: lease } = await (supabase
      .from('leases')
      .select('id, status, tenant_id, owner_id, tenant:tenant_id(id, first_name, last_name, email, phone), owner:owner_id(id, first_name, last_name, email, phone), property:property_id(id, title)')
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
    const isSamePerson = lease.owner_id === lease.tenant_id
    const alreadySigned = isSamePerson
      ? !!(lease.owner_signed_at && lease.tenant_signed_at)
      : isOwner ? !!lease.owner_signed_at : !!lease.tenant_signed_at
    if (alreadySigned) {
      const resp = NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
      return applyCookies(resp)
    }

    // Même personne : pas besoin d'OTP, la signature est immédiate sans CRYPTONEO
    if (isSamePerson) {
      const resp = NextResponse.json({
        message: 'Signature disponible sans code (même propriétaire et locataire).',
        sentTo: lease.owner?.email || lease.owner?.phone || '',
        canal: 'NONE',
      })
      return applyCookies(resp)
    }

    // Déterminer le canal et le destinataire
    const recipient = isOwner ? lease.owner : lease.tenant
    let canal = 'MAIL'
    let recipientEmail = recipient?.email || ''
    let recipientPhone = recipient?.phone || ''

    // Si l'utilisateur a un email → MAIL, sinon SMS si téléphone disponible
    if (!recipientEmail && recipientPhone) {
      canal = 'SMS'
    }

    if (!recipientEmail && !recipientPhone) {
      const resp = NextResponse.json(
        { error: 'Aucun email ou téléphone trouvé pour le destinataire' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    // Envoyer l'OTP via CRYPTONEO
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sign-send-otp`
    const bearerToken = getEdgeFunctionBearerToken(accessToken, authSource)
    if (!bearerToken) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const body: Record<string, string> = { canal }
    if (recipientEmail) body.email = recipientEmail
    if (recipientPhone && canal === 'SMS') body.phone = recipientPhone

    console.log('[request-sign-otp] Calling sign-send-otp:', { canal, email: recipientEmail, phone: recipientPhone, userId, isOwner, leaseId: id })

    const otpRes = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
        ...(accessToken ? {} : { 'x-user-id': userId }),
      },
      body: JSON.stringify(body),
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

    const sentLabel = canal === 'SMS' ? 'par SMS' : 'par email'
    const resp = NextResponse.json({
      message: isOwner
        ? `Un code OTP vous a été envoyé ${sentLabel}. Vérifiez votre ${canal === 'SMS' ? 'téléphone' : 'boîte de réception'}.`
        : 'Code de vérification envoyé.',
      sentTo: recipientEmail || recipientPhone,
      canal,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Request sign OTP error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}