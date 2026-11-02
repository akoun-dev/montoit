import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendEmail, sendSms } from '@/lib/ansut-messaging'

// Sends a real test message on the requested channel to the authenticated
// admin's own contact info, so the "test" button reflects actual delivery
// instead of a fake success toast.
export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()
    const { data: profile } = await admin
      .from('users')
      .select('role, email, phone, first_name')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const body = await req.json().catch(() => ({}))
    const channel = body?.channel as 'email' | 'sms' | undefined

    if (channel === 'email') {
      if (!profile.email) {
        const resp = NextResponse.json({ error: 'Aucune adresse email associée à votre compte' }, { status: 400 })
        return applyCookies(resp)
      }
      const result = await sendEmail({
        to: profile.email,
        subject: 'Mon Toit - Test de notification',
        content: `<p>Bonjour ${profile.first_name || ''},</p><p>Ceci est un email de test envoyé depuis la configuration admin de Mon Toit.</p>`,
        isHtml: true,
      })
      const resp = NextResponse.json({ success: result.success, message: result.message })
      return applyCookies(resp)
    }

    if (channel === 'sms') {
      if (!profile.phone) {
        const resp = NextResponse.json({ error: 'Aucun numéro de téléphone associé à votre compte' }, { status: 400 })
        return applyCookies(resp)
      }
      const result = await sendSms({
        to: profile.phone,
        text: 'Mon Toit - Ceci est un SMS de test envoyé depuis la configuration admin.',
      })
      const resp = NextResponse.json({ success: result.success, message: result.message })
      return applyCookies(resp)
    }

    const resp = NextResponse.json({ error: 'Canal invalide' }, { status: 400 })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin settings test-channel error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
