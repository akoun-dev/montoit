import { NextRequest, NextResponse } from 'next/server'
import { getUserIdAndRole } from '@/lib/session'
import { cryptoneoFetch } from '@/lib/cryptoneo'
import type { CryptoneoVerifyResponse } from '@/lib/cryptoneo'

/**
 * POST /api/signature/verify
 * Verifies a signed batch via CRYPTONEO /sign/verifySignedBatch.
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const session = await getUserIdAndRole(req)
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Parse request body
    const body = await req.json()
    const { operationId } = body as { operationId: string }

    if (!operationId) {
      return NextResponse.json({ error: 'operationId requis' }, { status: 400 })
    }

    // Call CRYPTONEO API to verify signed batch
    const res = await cryptoneoFetch('/sign/verifySignedBatch', {
      method: 'POST',
      body: JSON.stringify({ operationId }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `CRYPTONEO vérification échouée (${res.status}): ${text}` },
        { status: 502 },
      )
    }

    const data: CryptoneoVerifyResponse = await res.json()

    return NextResponse.json({ results: data?.data?.results || data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
