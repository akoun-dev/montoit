import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import crypto from 'crypto'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId } = authResult

    const { id } = await params

    const lease = await db.lease.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, title: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        tenant: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    if (!lease) {
      return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
    }

    if (lease.tenantId !== userId && lease.ownerId !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (lease.status !== 'PENDING_SIGNATURE') {
      return NextResponse.json(
        { error: 'Ce bail ne peut pas être signé (statut: ' + lease.status + ')' },
        { status: 400 }
      )
    }

    // Check if user already signed
    const alreadySigned = lease.ownerId === userId ? !!lease.ownerSignedAt : !!lease.tenantSignedAt
    if (alreadySigned) {
      return NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
    }

    // Check if there's a valid unused OTP already
    const existingOtp = await db.oTPCode.findFirst({
      where: {
        userId,
        type: 'BAIL_SIGNATURE',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (existingOtp) {
      // Return existing OTP code instead of creating a new one
      return NextResponse.json({ otpCode: existingOtp.code })
    }

    // Generate new OTP
    const otpCode = crypto.randomInt(100000, 999999).toString()
    const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await db.oTPCode.create({
      data: {
        code: otpCode,
        type: 'BAIL_SIGNATURE',
        email: lease.tenant.email,
        expiresAt: otpExpiry,
        userId,
      },
    })

    return NextResponse.json({ otpCode })
  } catch (error) {
    console.error('Request sign OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
