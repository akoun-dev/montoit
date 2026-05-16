import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

// GET /api/leases/[id] — Get a single lease detail
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
    const lease = await db.lease.findFirst({
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
            area: true,
            bedrooms: true,
            bathrooms: true,
            images: {
              orderBy: { order: 'asc' },
              take: 3,
              select: { url: true },
            },
          },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            dueDate: true,
            paidAt: true,
            reference: true,
          },
          orderBy: { dueDate: 'desc' },
          take: 6,
        },
        maintenanceRequests: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!lease) {
      return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
    }

    return NextResponse.json({ data: lease })
  } catch (error) {
    console.error('Lease detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
