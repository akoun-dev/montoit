import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

const VALID_INVENTORY_TYPES = ['INVENTORY_ENTRANCE', 'INVENTORY_EXIT'] as const
const VALID_INVENTORY_STATUSES = ['DRAFT', 'COMPLETED', 'SIGNED_OWNER', 'SIGNED_TENANT', 'SIGNED_BOTH'] as const
const VALID_ROOM_CONDITIONS = ['BON', 'MAUVAIS'] as const

// GET /api/tc/inventory-reports — List inventory reports
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get('propertyId')
    const leaseId = searchParams.get('leaseId')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 20
    const offset = offsetParam ? parseInt(offsetParam) : 0

    // Build where clause
    const where: Record<string, unknown> = {}

    if (propertyId) {
      where.propertyId = propertyId
    }

    if (leaseId) {
      where.leaseId = leaseId
    }

    if (type && VALID_INVENTORY_TYPES.includes(type as typeof VALID_INVENTORY_TYPES[number])) {
      where.type = type
    }

    if (status && VALID_INVENTORY_STATUSES.includes(status as typeof VALID_INVENTORY_STATUSES[number])) {
      where.status = status
    }

    // TC can see all reports; others see only reports for their properties/leases
    if (effectiveRole !== 'TIERS_CONFIANCE' && effectiveRole !== 'ADMIN') {
      where.OR = [
        { property: { ownerId: userId } },
        { lease: { tenantId: userId } },
      ]
    }

    const [reports, total] = await Promise.all([
      db.inventoryReport.findMany({
        where,
        include: {
          property: {
            select: {
              id: true,
              title: true,
              address: true,
              city: true,
              commune: true,
            },
          },
          lease: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              tenant: {
                select: { id: true, firstName: true, lastName: true },
              },
              owner: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          items: {
            orderBy: { designationOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.inventoryReport.count({ where }),
    ])

    return NextResponse.json({
      reports,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Inventory reports GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/tc/inventory-reports — Create an inventory report
export async function POST(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'TIERS_CONFIANCE') {
      return NextResponse.json(
        { error: 'Accès refusé — rôle TIERS_CONFIANCE requis' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { propertyId, type, leaseId, items, generalObservations, totalKeys } = body

    // Validate required fields
    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'propertyId est requis' }, { status: 400 })
    }

    if (!type || !VALID_INVENTORY_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type doit être l'un des suivants : ${VALID_INVENTORY_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate property exists
    const property = await db.property.findUnique({ where: { id: propertyId } })
    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    // Validate lease if provided
    if (leaseId) {
      const lease = await db.lease.findUnique({ where: { id: leaseId } })
      if (!lease) {
        return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      }
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Au moins un élément est requis' }, { status: 400 })
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.designation || typeof item.designation !== 'string') {
        return NextResponse.json(
          { error: `Élément ${i + 1} : la désignation est requise` },
          { status: 400 }
        )
      }
      // Validate room conditions if provided
      const conditionFields = ['kitchen', 'mainBathroom', 'otherBathroom', 'otherRoom1', 'otherRoom2'] as const
      for (const field of conditionFields) {
        if (item[field] !== undefined && item[field] !== null && !VALID_ROOM_CONDITIONS.includes(item[field])) {
          return NextResponse.json(
            { error: `Élément ${i + 1} : ${field} doit être BON ou MAUVAIS` },
            { status: 400 }
          )
        }
      }
    }

    // Create report with items in a transaction
    const report = await db.inventoryReport.create({
      data: {
        propertyId,
        type,
        leaseId: leaseId || null,
        generalObservations: generalObservations || null,
        totalKeys: totalKeys !== undefined ? Number(totalKeys) : null,
        reviewerId: userId,
        status: 'DRAFT',
        items: {
          create: items.map((item: {
            designation: string
            designationOrder?: number
            kitchen?: string | null
            mainBathroom?: string | null
            otherBathroom?: string | null
            otherRoom1?: string | null
            otherRoom2?: string | null
            observations?: string | null
          }, index: number) => ({
            designation: item.designation,
            designationOrder: item.designationOrder !== undefined ? Number(item.designationOrder) : index + 1,
            kitchen: item.kitchen || null,
            mainBathroom: item.mainBathroom || null,
            otherBathroom: item.otherBathroom || null,
            otherRoom1: item.otherRoom1 || null,
            otherRoom2: item.otherRoom2 || null,
            observations: item.observations || null,
          })),
        },
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
          },
        },
        lease: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
          },
        },
        items: {
          orderBy: { designationOrder: 'asc' },
        },
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'INVENTORY_REPORT_CREATED',
        entity: 'InventoryReport',
        entityId: report.id,
        details: JSON.stringify({ propertyId, type, itemCount: items.length }),
        userId,
      },
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('Inventory reports POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/tc/inventory-reports — Update an inventory report (add items, update status, sign)
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    const body = await req.json()
    const { reportId, items, generalObservations, totalKeys, status, ownerSigned, tenantSigned } = body

    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json({ error: 'reportId est requis' }, { status: 400 })
    }

    // Find the report
    const report = await db.inventoryReport.findUnique({
      where: { id: reportId },
      include: {
        property: { select: { ownerId: true } },
        lease: { select: { tenantId: true } },
      },
    })

    if (!report) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })
    }

    const isTC = effectiveRole === 'TIERS_CONFIANCE'
    const isOwner = report.property.ownerId === userId
    const isTenant = report.lease?.tenantId === userId

    // Build update data
    const updateData: Record<string, unknown> = {}

    // TC can update items and observations
    if (isTC) {
      if (items !== undefined) {
        if (!Array.isArray(items)) {
          return NextResponse.json({ error: 'items doit être un tableau' }, { status: 400 })
        }

        // Delete existing items and create new ones
        await db.inventoryReportItem.deleteMany({ where: { reportId } })

        // Validate new items
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (!item.designation || typeof item.designation !== 'string') {
            return NextResponse.json(
              { error: `Élément ${i + 1} : la désignation est requise` },
              { status: 400 }
            )
          }
          const conditionFields = ['kitchen', 'mainBathroom', 'otherBathroom', 'otherRoom1', 'otherRoom2'] as const
          for (const field of conditionFields) {
            if (item[field] !== undefined && item[field] !== null && !VALID_ROOM_CONDITIONS.includes(item[field])) {
              return NextResponse.json(
                { error: `Élément ${i + 1} : ${field} doit être BON ou MAUVAIS` },
                { status: 400 }
              )
            }
          }
        }

        updateData.items = {
          create: items.map((item: {
            designation: string
            designationOrder?: number
            kitchen?: string | null
            mainBathroom?: string | null
            otherBathroom?: string | null
            otherRoom1?: string | null
            otherRoom2?: string | null
            observations?: string | null
          }, index: number) => ({
            designation: item.designation,
            designationOrder: item.designationOrder !== undefined ? Number(item.designationOrder) : index + 1,
            kitchen: item.kitchen || null,
            mainBathroom: item.mainBathroom || null,
            otherBathroom: item.otherBathroom || null,
            otherRoom1: item.otherRoom1 || null,
            otherRoom2: item.otherRoom2 || null,
            observations: item.observations || null,
          })),
        }
      }

      if (generalObservations !== undefined) {
        updateData.generalObservations = generalObservations
      }

      if (totalKeys !== undefined) {
        updateData.totalKeys = Number(totalKeys)
      }
    }

    // Status update
    if (status !== undefined) {
      if (!VALID_INVENTORY_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `status doit être l'un des suivants : ${VALID_INVENTORY_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      // Only TC can update status (except signing which is handled below)
      if (!isTC && status !== 'SIGNED_OWNER' && status !== 'SIGNED_TENANT') {
        return NextResponse.json(
          { error: 'Seul un TC peut modifier le statut du rapport' },
          { status: 403 }
        )
      }
      updateData.status = status
    }

    // Owner signing
    if (ownerSigned === true) {
      if (!isOwner && !isTC) {
        return NextResponse.json(
          { error: 'Seul le propriétaire ou un TC peut signer pour le propriétaire' },
          { status: 403 }
        )
      }
      updateData.ownerSignedAt = new Date()
      // Auto-update status
      if (report.tenantSignedAt) {
        updateData.status = 'SIGNED_BOTH'
      } else {
        updateData.status = 'SIGNED_OWNER'
      }
    }

    // Tenant signing
    if (tenantSigned === true) {
      if (!isTenant && !isTC) {
        return NextResponse.json(
          { error: 'Seul le locataire ou un TC peut signer pour le locataire' },
          { status: 403 }
        )
      }
      updateData.tenantSignedAt = new Date()
      // Auto-update status
      if (report.ownerSignedAt) {
        updateData.status = 'SIGNED_BOTH'
      } else {
        updateData.status = 'SIGNED_TENANT'
      }
    }

    // Only allow update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    const updatedReport = await db.inventoryReport.update({
      where: { id: reportId },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
          },
        },
        lease: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
          },
        },
        items: {
          orderBy: { designationOrder: 'asc' },
        },
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'INVENTORY_REPORT_UPDATED',
        entity: 'InventoryReport',
        entityId: reportId,
        details: JSON.stringify({
          updatedFields: Object.keys(updateData),
          userId,
        }),
        userId,
      },
    })

    return NextResponse.json({ report: updatedReport })
  } catch (error) {
    console.error('Inventory reports PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
