import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { cryptoneoFetch } from '@/lib/cryptoneo'

/**
 * POST /api/signature/send-otp
 * Sends an OTP for signature verification via CRYPTONEO.
 * Uses the user's stored alias from the SignatureAlias table.
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const session = await getUserIdAndRole(req)
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId } = session

    // Get user's alias
    const alias = await db.signatureAlias.findUnique({
      where: { userId },
    })

    if (!alias || !alias.isActive) {
      return NextResponse.json(
        { error: 'Aucun certificat actif trouvé. Veuillez d\'abord générer un certificat.' },
        { status: 400 },
      )
    }

    // Parse optional canal
    const body = await req.json().catch(() => ({}))
    const { canal } = body as { canal?: 'MAIL' | 'SMS' }

    // Call CRYPTONEO API to send OTP
    const payload: Record<string, unknown> = {
      aliasCertificat: alias.aliasCertificat,
    }
    if (canal) payload.canal = canal

    const res = await cryptoneoFetch('/otp/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `CRYPTONEO OTP envoi échoué (${res.status}): ${text}` },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
