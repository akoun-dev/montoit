import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-callback`

/**
 * SEC-003 — Webhook paiement fail-CLOSED.
 *
 * Le secret est OBLIGATOIRE : si `PAYMENT_CALLBACK_SECRET` est absent, la route
 * répond 503 et ne relaie jamais le callback (avant : HMAC skippé → paiement
 * fictif possible). La signature attendue est HMAC-SHA256 hexadécimal du corps
 * brut de la requête, envoyée dans l'en-tête `x-webhook-signature` (un préfixe
 * optionnel `sha256=` est toléré). La comparaison est timing-safe.
 */
function getCallbackSecret(): string | null {
  const secret = process.env.PAYMENT_CALLBACK_SECRET
  return secret && secret.trim().length > 0 ? secret : null
}

function verifyHmacSignature(req: NextRequest, rawBody: string, secret: string): boolean {
  const signatureHeader = req.headers.get('x-webhook-signature')
  if (!signatureHeader) return false

  const signature = signatureHeader.trim().replace(/^sha256=/i, '')
  if (!signature) return false

  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed))
  } catch {
    // Longueurs différentes (signature tronquée/modifiée) → invalide
    return false
  }
}

export async function POST(req: NextRequest) {
  // Fail-closed : sans secret configuré, aucun callback n'est accepté.
  const secret = getCallbackSecret()
  if (!secret) {
    console.error(
      '[payment-callback][SEC-003] PAYMENT_CALLBACK_SECRET manquant — webhook désactivé (503).',
    )
    return NextResponse.json(
      { error: 'Webhook paiement indisponible (secret de callback non configuré)' },
      { status: 503 },
    )
  }

  try {
    // HMAC calculé sur le corps BRUT (celui signé par l'émetteur), pas sur une
    // ré-serialisation JSON qui changerait l'ordre des clés / l'espacement.
    const rawBody = await req.text()

    if (!verifyHmacSignature(req, rawBody, secret)) {
      console.warn('[payment-callback][SEC-003] Callback rejeté : signature HMAC absente ou invalide')
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
    }

    // S3-Edge — L'Edge Function est passée en verify_jwt = true (gate JWT
    // Supabase). Le proxy présente la clé service_role, côté serveur
    // uniquement. Sans cette clé, on ne relaie pas (fail-closed).
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error(
        '[payment-callback][S3-Edge] SUPABASE_SERVICE_ROLE_KEY manquant — relais Edge désactivé (503).',
      )
      return NextResponse.json(
        { error: 'Webhook paiement indisponible (clé de service non configurée)' },
        { status: 503 },
      )
    }

    // Le corps BRUT est transmis TEL QUEL (pas de ré-serialisation) et la
    // signature d'origine est relayée : l'Edge revérifie le même HMAC.
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': req.headers.get('x-webhook-signature') ?? '',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: rawBody || undefined,
    })

    const data = await res.json().catch(() => ({ received: true }))
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Payment callback proxy error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// SEC-003 — Le GET non signé (qui permettait de marquer un paiement SUCCESS via
// de simples query params) est supprimé : 405 Method Not Allowed.
export async function GET() {
  return NextResponse.json({ error: 'Méthode non autorisée' }, { status: 405 })
}
