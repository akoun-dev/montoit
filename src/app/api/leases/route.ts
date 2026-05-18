import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/leases — List all leases for the current user (tenant or owner)
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    // Both LOCATAIRE and PROPRIETAIRE can access their leases
    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') // Optional: filter by status

    // Build where clause based on role
    const where: Record<string, unknown> = {}
    if (effectiveRole === 'LOCATAIRE') {
      where.tenantId = userId
    } else if (effectiveRole === 'PROPRIETAIRE') {
      where.ownerId = userId
    }

    // Optional status filter
    if (statusFilter) {
      where.status = statusFilter
    }

    const leases = await db.lease.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            images: { orderBy: { order: 'asc' }, take: 1 },
          },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            dueDate: true,
          },
          orderBy: { dueDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: leases })
  } catch (error) {
    console.error('Leases GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
