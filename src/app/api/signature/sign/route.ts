import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { cryptoneoFetch } from '@/lib/cryptoneo'
import type { CryptoneoSignResponse, SignRequestItem } from '@/lib/cryptoneo'

/**
 * POST /api/signature/sign
 * Signs documents via CRYPTONEO /sign/signFileBatch.
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

    // Parse request body
    const body = await req.json()
    const { otp, signRequest, callBackUrl } = body as {
      otp: string
      signRequest: SignRequestItem[]
      callBackUrl?: string
    }

    if (!otp) {
      return NextResponse.json({ error: 'OTP requis' }, { status: 400 })
    }

    if (!signRequest || !Array.isArray(signRequest) || signRequest.length === 0) {
      return NextResponse.json({ error: 'Au moins un document à signer est requis' }, { status: 400 })
    }

    // Call CRYPTONEO API to sign documents
    const payload: Record<string, unknown> = {
      aliasCertificat: alias.aliasCertificat,
      otp,
      signRequest,
    }
    if (callBackUrl) payload.callBackUrl = callBackUrl

    const res = await cryptoneoFetch('/sign/signFileBatch', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `CRYPTONEO signature échouée (${res.status}): ${text}` },
        { status: 502 },
      )
    }

    const data: CryptoneoSignResponse = await res.json()

    return NextResponse.json({
      operationId: data?.data?.operationId || null,
      data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
