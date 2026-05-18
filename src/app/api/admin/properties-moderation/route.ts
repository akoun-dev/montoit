import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// GET /api/admin/properties-moderation — List properties pending admin moderation
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { effectiveRole } = authResult

    if (effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé — rôle ADMIN requis' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const type = searchParams.get('type')
    const commune = searchParams.get('commune')
    const search = searchParams.get('search')
    const statusFilter = searchParams.get('status')

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50
    const offset = offsetParam ? parseInt(offsetParam) : 0

    const where: Record<string, unknown> = {
      status: statusFilter || 'PENDING_VERIFICATION',
    }

    if (type) where.type = type
    if (commune) where.commune = { contains: commune }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { address: { contains: search } },
        { commune: { contains: search } },
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
              role: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      db.property.count({ where }),
    ])

    const result = properties.map(({ images, ...property }: { images: { url: string }[]; [key: string]: unknown }) => ({
      ...property,
      image: images.length > 0 ? images[0].url : null,
    }))

    return NextResponse.json({
      properties: result,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    })
  } catch (error) {
    console.error('Admin properties-moderation GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/admin/properties-moderation — Approve or reject a property
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé — rôle ADMIN requis' }, { status: 403 })
    }

    const body = await req.json()
    const { propertyId, action, comment } = body

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'propertyId est requis' }, { status: 400 })
    }

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'action doit être APPROVE ou REJECT' }, { status: 400 })
    }

    const property = await db.property.findUnique({ where: { id: propertyId } })

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (property.status !== 'PENDING_VERIFICATION' && property.status !== 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Ce bien n\'est pas en attente de modération' },
        { status: 400 }
      )
    }

    let updatedProperty

    if (action === 'APPROVE') {
      updatedProperty = await db.property.update({
        where: { id: propertyId },
        data: {
          status: 'ACTIVE',
          isVerified: true,
        },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          images: { orderBy: { order: 'asc' } },
        },
      })

      await db.auditLog.create({
        data: {
          action: 'PROPERTY_APPROVED_BY_ADMIN',
          entity: 'Property',
          entityId: propertyId,
          details: JSON.stringify({ comment: comment || null, adminId: userId }),
          userId,
        },
      })

      await notify({
        userId: property.ownerId,
        type: 'DOSSIER_UPDATE',
        title: 'Annonce approuvée',
        message: `Votre annonce "${property.title}" a été approuvée par l'administration et est maintenant visible.`,
        actionUrl: 'my-properties',
        entityId: propertyId,
      })
    } else {
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
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          images: { orderBy: { order: 'asc' } },
        },
      })

      await db.auditLog.create({
        data: {
          action: 'PROPERTY_REJECTED_BY_ADMIN',
          entity: 'Property',
          entityId: propertyId,
          details: JSON.stringify({ comment: comment || null, adminId: userId }),
          userId,
        },
      })

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
    console.error('Admin properties-moderation PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
