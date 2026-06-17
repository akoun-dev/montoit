import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-callback`

function verifyHmacSignature(req: NextRequest, body: string): boolean {
  const secret = process.env.PAYMENT_CALLBACK_SECRET
  if (!secret) {
    console.warn('[payment-callback] PAYMENT_CALLBACK_SECRET not set — skipping HMAC verification')
    return true
  }

  const signature = req.headers.get('x-webhook-signature')
  if (!signature) return false

  const computed = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const rawBody = body ? JSON.stringify(body) : ''

    if (!verifyHmacSignature(req, rawBody)) {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
    }

    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: rawBody || undefined,
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Payment callback proxy error:', error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const qs = searchParams.toString()
    const url = qs ? `${functionUrl}?${qs}` : functionUrl

    const res = await fetch(url, { method: 'GET' })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Payment callback GET proxy error:', error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
