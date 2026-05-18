import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const commissions = await db.commission.findMany({
      where: { agencyId: userId },
      include: {
        agent: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        mandat: {
          select: {
            id: true,
            commissionRate: true,
            property: { select: { id: true, title: true, city: true } },
          },
        },
        lease: {
          select: {
            id: true,
            monthlyRent: true,
            property: { select: { id: true, title: true } },
            tenant: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ commissions })
  } catch (error) {
    console.error('Get commissions error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { commissionId } = body

    if (!commissionId) {
      return NextResponse.json({ error: 'ID de commission requis' }, { status: 400 })
    }

    const commission = await db.commission.findFirst({
      where: { id: commissionId, agencyId: userId },
    })

    if (!commission) {
      return NextResponse.json({ error: 'Commission non trouvée' }, { status: 404 })
    }

    if (commission.status === 'PAID') {
      return NextResponse.json({ error: 'Commission déjà payée' }, { status: 400 })
    }

    const updated = await db.commission.update({
      where: { id: commissionId },
      data: { status: 'PAID', paidAt: new Date() },
    })

    return NextResponse.json({ commission: updated })
  } catch (error) {
    console.error('Update commission error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
