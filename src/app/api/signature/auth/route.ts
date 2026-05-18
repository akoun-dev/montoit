import { NextResponse } from 'next/server'
import { getCryptoneoToken } from '@/lib/cryptoneo'

/**
 * POST /api/signature/auth
 * Authenticates with the CRYPTONEO API and returns a JWT token.
 * The token is cached server-side with a 30-minute TTL.
 */
export async function POST() {
  try {
    const token = await getCryptoneoToken()
    return NextResponse.json({ token })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
