import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/maintenance — List maintenance requests for current tenant
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status') || undefined
    const priority = searchParams.get('priority') || undefined
    const leaseId = searchParams.get('leaseId') || undefined

    // Build where clause — LOCATAIRE sees their own requests, PROPRIETAIRE sees requests for their properties
    let where: Record<string, unknown>
    if (effectiveRole === 'PROPRIETAIRE') {
      where = { lease: { ownerId: userId } }
    } else {
      where = { tenantId: userId }
    }
    if (status) {
      where.status = status
    }
    if (priority) {
      where.priority = priority
    }
    if (leaseId) {
      where.leaseId = leaseId
    }

    const [requests, total] = await Promise.all([
      db.maintenanceRequest.findMany({
        where,
        include: {
          lease: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              monthlyRent: true,
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
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.maintenanceRequest.count({ where }),
    ])

    // Count by status for quick stats
    const statsWhere = effectiveRole === 'PROPRIETAIRE'
      ? { lease: { ownerId: userId } }
      : { tenantId: userId }
    const statusCounts = await db.maintenanceRequest.groupBy({
      by: ['status'],
      where: statsWhere,
      _count: { status: true },
    })

    const stats = Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.status])
    )

    return NextResponse.json({
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    })
  } catch (error) {
    console.error('Maintenance GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/maintenance — Create a new maintenance request
export async function POST(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { leaseId, title, description, priority } = body as {
      leaseId?: string
      title?: string
      description?: string
      priority?: string
    }

    // Validate required fields
    if (!leaseId || !title || !description) {
      return NextResponse.json(
        { error: 'leaseId, title et description sont requis' },
        { status: 400 }
      )
    }

    // Validate that the lease belongs to this tenant
    const lease = await db.lease.findFirst({
      where: { id: leaseId, tenantId: userId },
    })
    if (!lease) {
      return NextResponse.json(
        { error: 'Bail introuvable ou accès refusé' },
        { status: 404 }
      )
    }

    // Validate priority
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    const resolvedPriority = validPriorities.includes(priority || '') ? priority : 'MEDIUM'

    const maintenanceRequest = await db.maintenanceRequest.create({
      data: {
        title,
        description,
        priority: resolvedPriority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        leaseId,
        tenantId: userId,
      },
      include: {
        lease: {
          select: {
            id: true,
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
          },
        },
      },
    })

    // Log to audit
    await db.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'MaintenanceRequest',
        entityId: maintenanceRequest.id,
        details: `Demande de maintenance créée: ${title}`,
        userId,
      },
    })

    return NextResponse.json({ data: maintenanceRequest }, { status: 201 })
  } catch (error) {
    console.error('Maintenance POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
