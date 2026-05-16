import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

// GET /api/visits/[id] — Get a single visit request detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user || user.role !== 'LOCATAIRE') {
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
