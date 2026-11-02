import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'

// SEC-009 — Plafond configurable par transfert d'argent (anti-fraude).
// Surchargable via la variable d'environnement MAX_TRANSFER_AMOUNT_XOF.
const MAX_TRANSFER_AMOUNT_XOF = (() => {
  const parsed = Number(process.env.MAX_TRANSFER_AMOUNT_XOF)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5_000_000
})()

// POST /api/payments/paiement-immediat — Proxy to Edge Function for wallet-to-wallet transfers
export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const body = await req.json()

    // SEC-009 — Validation serveur du montant avant proxy vers l'Edge Function
    // (celle-ci n'impose aucun plafond : un compte AGENCE compromis pourrait
    // vider un wallet en un seul transfert).
    const montant = Number(body?.montant)
    if (!Number.isFinite(montant) || montant <= 0) {
      return applyCookies(NextResponse.json({ error: 'Montant invalide' }, { status: 400 }))
    }
    if (montant > MAX_TRANSFER_AMOUNT_XOF) {
      console.warn(
        `[paiement-immediat][SEC-009] Transfert refusé (plafond ${MAX_TRANSFER_AMOUNT_XOF} XOF) : ${montant} XOF`,
      )
      return applyCookies(
        NextResponse.json(
          {
            error: `Montant au-delà du plafond autorisé (${MAX_TRANSFER_AMOUNT_XOF.toLocaleString('fr-FR')} XOF par transfert)`,
          },
          { status: 422 },
        ),
      )
    }

    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-transfer`

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
    console.error('Payment transfer proxy error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors du transfert' },
      { status: 500 }
    )
  }
}
