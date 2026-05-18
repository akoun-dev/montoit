import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { cryptoneoFetch } from '@/lib/cryptoneo'
import type { CryptoneoCertificatResponse } from '@/lib/cryptoneo'

/**
 * POST /api/signature/generate-certificate
 * Generates a CRYPTONEO certificate for the authenticated user.
 * If the user already has an active SignatureAlias, returns it immediately.
 * Otherwise, calls CRYPTONEO /generateCert/generateCertificat and saves the alias.
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const session = await getUserIdAndRole(req)
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId } = session

    // Check if user already has an active alias
    const existingAlias = await db.signatureAlias.findUnique({
      where: { userId },
    })

    if (existingAlias && existingAlias.isActive) {
      return NextResponse.json({
        aliasCertificat: existingAlias.aliasCertificat,
        existing: true,
      })
    }

    // Parse request body
    const body = await req.json()
    const {
      firstName,
      lastName,
      gender,
      email,
      phone,
      organisation,
      typePiece = 'CNI',
      hashPiece,
      base64,
    } = body as {
      firstName: string
      lastName: string
      gender?: string
      email: string
      phone?: string
      organisation?: string
      typePiece?: string
      hashPiece?: string
      base64?: string
    }

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Prénom, nom et email sont requis' },
        { status: 400 },
      )
    }

    // Call CRYPTONEO API to generate certificate
    const payload: Record<string, unknown> = {
      firstName,
      lastName,
      email,
      typePiece,
    }

    if (gender) payload.gender = gender
    if (phone) payload.phone = phone
    if (organisation) payload.organisation = organisation
    if (hashPiece) payload.hashPiece = hashPiece
    if (base64) payload.base64 = base64

    const res = await cryptoneoFetch('/generateCert/generateCertificat', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `CRYPTONEO certificate generation failed (${res.status}): ${text}` },
        { status: 502 },
      )
    }

    const data: CryptoneoCertificatResponse = await res.json()

    const aliasCertificat = data?.data?.aliasCertificat
    if (!aliasCertificat) {
      return NextResponse.json(
        { error: `CRYPTONEO returned no alias: ${JSON.stringify(data)}` },
        { status: 502 },
      )
    }

    // If user had an inactive alias, deactivate all old ones first
    if (existingAlias && !existingAlias.isActive) {
      await db.signatureAlias.update({
        where: { id: existingAlias.id },
        data: { isActive: false },
      })
    }

    // Save alias to database
    const savedAlias = await db.signatureAlias.create({
      data: {
        aliasCertificat,
        firstName,
        lastName,
        gender: gender || null,
        email,
        phone: phone || null,
        organisation: organisation || null,
        typePiece,
        hashPiece: hashPiece || null,
        certificateData: JSON.stringify(data),
        isActive: true,
        userId,
      },
    })

    return NextResponse.json({
      aliasCertificat: savedAlias.aliasCertificat,
      existing: false,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
