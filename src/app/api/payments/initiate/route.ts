import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'

// SEC-009 — Plafond configurable par paiement/transfert (anti-fraude).
// Surchargable via la variable d'environnement MAX_TRANSFER_AMOUNT_XOF.
const MAX_TRANSFER_AMOUNT_XOF = (() => {
  const parsed = Number(process.env.MAX_TRANSFER_AMOUNT_XOF)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5_000_000
})()

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const body = await req.json()

    // SEC-009 — Contrôle serveur du montant avant proxy vers l'Edge Function.
    const rawAmount = body?.montant ?? body?.amount
    if (rawAmount !== undefined && rawAmount !== null) {
      const montant = Number(rawAmount)
      if (!Number.isFinite(montant) || montant <= 0) {
        return applyCookies(NextResponse.json({ error: 'Montant invalide' }, { status: 400 }))
      }
      if (montant > MAX_TRANSFER_AMOUNT_XOF) {
        console.warn(
          `[payments/initiate][SEC-009] Paiement refusé (plafond ${MAX_TRANSFER_AMOUNT_XOF} XOF) : ${montant} XOF`,
        )
        return applyCookies(
          NextResponse.json(
            {
              error: `Montant au-delà du plafond autorisé (${MAX_TRANSFER_AMOUNT_XOF.toLocaleString('fr-FR')} XOF par transaction)`,
            },
            { status: 422 },
          ),
        )
      }
    }

    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-initiate`

    if (!accessToken) {
      return applyCookies(NextResponse.json({ error: 'Session invalide' }, { status: 401 }))
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }

    const res = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return applyCookies(NextResponse.json(data, { status: res.status }))
  } catch (error) {
    console.error('Payment initiate proxy error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'initiation du paiement' },
      { status: 500 },
    )
  }
}
