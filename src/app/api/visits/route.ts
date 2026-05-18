import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// GET /api/visits — List visit requests for the current user
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    // For tenants: list their visit requests
    // For owners/agences: list visit requests for their properties, ONLY from TC-verified tenants
    let where: Record<string, unknown>
    if (effectiveRole === 'LOCATAIRE') {
      where = { tenantId: userId }
    } else if (effectiveRole === 'PROPRIETAIRE') {
      // Propriétaire sees visits for their properties, only from tenants with validated rental files (TC-verified)
      where = {
        property: { ownerId: userId },
        tenant: {
          rentalFiles: {
            some: { status: 'VALIDATED' }
          }
        }
      }
    } else if (effectiveRole === 'AGENCE') {
      // Agence sees visits for properties under their mandats, only from TC-verified tenants
      where = {
        property: {
          mandats: {
            some: { agencyId: userId, status: 'ACTIVE' }
          }
        },
        tenant: {
          rentalFiles: {
            some: { status: 'VALIDATED' }
          }
        }
      }
    } else {
      where = {}
    }

    const visits = await db.visitRequest.findMany({
      where,
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
            images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
          },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: visits })
  } catch (error) {
    console.error('Visits GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/visits — Create a visit request
export async function POST(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Seuls les locataires peuvent demander des visites' }, { status: 403 })
    }

    const body = await req.json()
    const { propertyId, visitType, requestedDate, timeSlot, tenantMessage } = body

    if (!propertyId || !requestedDate || !timeSlot) {
      return NextResponse.json({ error: 'propertyId, requestedDate et timeSlot sont requis' }, { status: 400 })
    }

    // Verify property exists and is available
    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: { id: true, rentalStatus: true },
    })

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (property.rentalStatus === 'loue') {
      return NextResponse.json({ error: 'Ce bien est déjà loué' }, { status: 400 })
    }

    // Check if tenant already has a pending visit for this property
    const existingVisit = await db.visitRequest.findFirst({
      where: {
        propertyId,
        tenantId: userId,
        status: 'PENDING',
      },
    })

    if (existingVisit) {
      return NextResponse.json({ error: 'Vous avez déjà une demande de visite en attente pour ce bien' }, { status: 409 })
    }

    const visit = await db.visitRequest.create({
      data: {
        propertyId,
        tenantId: userId,
        visitType: visitType || 'PHYSICAL',
        requestedDate: new Date(requestedDate),
        timeSlot,
        tenantMessage: tenantMessage || null,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            type: true,
            price: true,
            ownerId: true,
          },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    // Notify the property owner about the new visit request
    await notify({
      userId: visit.property.ownerId,
      type: 'VISIT_REMINDER',
      title: 'Nouvelle demande de visite',
      message: `${visit.tenant.firstName} ${visit.tenant.lastName} souhaite visiter "${visit.property.title}".`,
      actionUrl: 'visit-requests',
      entityId: visit.id,
    })

    // Also notify agency if the property is under a mandat
    const mandats = await db.mandat.findMany({
      where: { propertyId, status: 'ACTIVE' },
      select: { agencyId: true },
    })
    for (const mandat of mandats) {
      if (mandat.agencyId !== visit.property.ownerId) {
        await notify({
          userId: mandat.agencyId,
          type: 'VISIT_REMINDER',
          title: 'Nouvelle demande de visite',
          message: `${visit.tenant.firstName} ${visit.tenant.lastName} souhaite visiter "${visit.property.title}".`,
          actionUrl: 'visits',
          entityId: visit.id,
        })
      }
    }

    return NextResponse.json({ data: visit }, { status: 201 })
  } catch (error) {
    console.error('Visit request POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
