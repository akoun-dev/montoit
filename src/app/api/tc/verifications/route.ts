import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// GET /api/tc/verifications — List properties pending TC verification, or get a single property by ID
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { effectiveRole } = authResult

    if (effectiveRole !== 'TIERS_CONFIANCE') {
      return NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE requis' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get('propertyId')

    // Single property lookup by ID
    if (propertyId) {
      const property = await db.property.findUnique({
        where: { id: propertyId },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
          },
        },
      })

      if (!property) {
        return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
      }

      return NextResponse.json({ property })
    }

    // List all pending properties
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const commune = searchParams.get('commune')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const statusFilter = searchParams.get('status') // Allow filtering by status

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 20
    const offset = offsetParam ? parseInt(offsetParam) : 0

    // Build where clause — default to PENDING_VERIFICATION, but allow override
    const where: Record<string, unknown> = {
      status: statusFilter || 'PENDING_VERIFICATION',
    }

    if (commune) {
      where.commune = { contains: commune }
    }

    if (type) {
      where.type = type
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { commune: { contains: search } },
        { address: { contains: search } },
      ]
    }

    const [properties, total] = await Promise.all([
      db.property.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      db.property.count({ where }),
    ])

    return NextResponse.json({
      properties,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('TC verifications GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/tc/verifications — Verify or reject a property
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'TIERS_CONFIANCE') {
      return NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE requis' }, { status: 403 })
    }

    const body = await req.json()
    const { propertyId, action, comment } = body

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'propertyId est requis' }, { status: 400 })
    }

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'action doit être APPROVE ou REJECT' }, { status: 400 })
    }

    // Find the property
    const property = await db.property.findUnique({
      where: { id: propertyId },
    })

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (property.status !== 'PENDING_VERIFICATION') {
      return NextResponse.json(
        { error: 'Ce bien n\'est pas en attente de vérification' },
        { status: 400 }
      )
    }

    let updatedProperty

    if (action === 'APPROVE') {
      // APPROVE → change status to ACTIVE, set isVerified to true
      updatedProperty = await db.property.update({
        where: { id: propertyId },
        data: {
          status: 'ACTIVE',
          isVerified: true,
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
          },
        },
      })

      // Create audit log
      await db.auditLog.create({
        data: {
          action: 'PROPERTY_APPROVED',
          entity: 'Property',
          entityId: propertyId,
          details: JSON.stringify({ comment: comment || null, reviewerId: userId }),
          userId,
        },
      })

      // Notify the owner
      await notify({
        userId: property.ownerId,
        type: 'DOSSIER_UPDATE',
        title: 'Annonce approuvée',
        message: `Votre annonce "${property.title}" a été approuvée et est maintenant visible.`,
        actionUrl: 'my-properties',
        entityId: propertyId,
      })
    } else {
      // REJECT → change status to SUSPENDED, store rejection reason
      updatedProperty = await db.property.update({
        where: { id: propertyId },
        data: {
          status: 'SUSPENDED',
          rentalTerms: JSON.stringify({
            ...(property.rentalTerms ? JSON.parse(typeof property.rentalTerms === 'string' ? property.rentalTerms : '{}') : {}),
            rejectionReason: comment || 'Non spécifié',
            rejectedAt: new Date().toISOString(),
            rejectedBy: userId,
          }),
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
          },
        },
      })

      // Create audit log
      await db.auditLog.create({
        data: {
          action: 'PROPERTY_REJECTED',
          entity: 'Property',
          entityId: propertyId,
          details: JSON.stringify({ comment: comment || null, reviewerId: userId }),
          userId,
        },
      })

      // Notify the owner
      await notify({
        userId: property.ownerId,
        type: 'DOSSIER_UPDATE',
        title: 'Annonce rejetée',
        message: `Votre annonce "${property.title}" a été rejetée. Raison : ${comment || 'Non spécifié'}`,
        actionUrl: 'my-properties',
        entityId: propertyId,
      })
    }

    return NextResponse.json({ property: updatedProperty })
  } catch (error) {
    console.error('TC verifications PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
