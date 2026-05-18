import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/visits — List visit requests for the current user
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    // For tenants: list their visit requests
    // For owners: list visit requests for their properties
    const where = effectiveRole === 'LOCATAIRE'
      ? { tenantId: userId }
      : effectiveRole === 'PROPRIETAIRE' || effectiveRole === 'AGENCE'
        ? { property: { ownerId: userId } }
        : {}

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
          },
        },
      },
    })

    return NextResponse.json({ data: visit }, { status: 201 })
  } catch (error) {
    console.error('Visit request POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
