import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/payments/[id] — Get a single payment detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params
    const payment = await db.payment.findFirst({
      where: { id, tenantId: userId },
      include: {
        lease: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            monthlyRent: true,
            charges: true,
            deposit: true,
            specialConditions: true,
            ownerSignedAt: true,
            tenantSignedAt: true,
            status: true,
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                city: true,
                images: {
                  orderBy: { order: 'asc' },
                  take: 1,
                  select: { url: true },
                },
              },
            },
            owner: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
    }

    return NextResponse.json({ data: payment })
  } catch (error) {
    console.error('Payment detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
