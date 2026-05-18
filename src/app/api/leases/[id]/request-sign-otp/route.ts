import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import crypto from 'crypto'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: lease } = await (supabase
      .from('leases')
      .select('id, status, tenant_id, owner_id, tenant:tenant_id(id, first_name, last_name, email), owner:owner_id(id, first_name, last_name), property:property_id(id, title)')
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

    const alreadySigned = lease.owner_id === userId ? !!lease.owner_signed_at : !!lease.tenant_signed_at
    if (alreadySigned) {
      const resp = NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
      return applyCookies(resp)
    }

    const { data: existingOtp } = await supabase
      .from('otp_codes')
      .select('code')
      .eq('user_id', userId)
      .eq('type', 'BAIL_SIGNATURE')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingOtp) {
      const resp = NextResponse.json({ otpCode: existingOtp.code })
      return applyCookies(resp)
    }

    const otpCode = crypto.randomInt(100000, 999999).toString()
    const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await supabase.from('otp_codes').insert({
      id: generateId(),
      code: otpCode,
      type: 'BAIL_SIGNATURE',
      email: (lease.tenant as any)?.email || '',
      expires_at: otpExpiry.toISOString(),
      user_id: userId,
    })

    const resp = NextResponse.json({ otpCode })
    return applyCookies(resp)
  } catch (error) {
    console.error('Request sign OTP error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}
