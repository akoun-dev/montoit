import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/visits/[id] — Get a single visit request detail
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
    const visit = await db.visitRequest.findFirst({
      where: { id, tenantId: userId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            type: true,
            price: true,
            currency: true,
            images: {
              orderBy: { order: 'asc' },
              take: 3,
              select: { url: true },
            },
            owner: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visite introuvable' }, { status: 404 })
    }

    return NextResponse.json({ data: visit })
  } catch (error) {
    console.error('Visit detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
