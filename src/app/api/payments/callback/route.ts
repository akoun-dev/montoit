import { NextRequest, NextResponse } from 'next/server'

const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-callback`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
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
