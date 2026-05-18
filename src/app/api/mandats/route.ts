import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// GET /api/mandats — List mandats for the authenticated owner (or agency)
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Build filter based on role
    const whereClause =
      effectiveRole === 'PROPRIETAIRE'
        ? { ownerId: userId }
        : { agencyId: userId }

    // Optional status filter from query params
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')
    if (statusFilter) {
      Object.assign(whereClause, { status: statusFilter })
    }

    const mandats = await db.mandat.findMany({
      where: whereClause,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            address: true,
            type: true,
            images: { orderBy: { order: 'asc' }, take: 1 },
          },
        },
        agency: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ mandats })
  } catch (error) {
    console.error('List mandats error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/mandats — Create a new mandat
export async function POST(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'PROPRIETAIRE') {
      return NextResponse.json({ error: 'Seul un propriétaire peut créer un mandat' }, { status: 403 })
    }

    const body = await req.json()
    const { propertyId, agencyId, type, commissionRate, startDate, endDate, conditions } = body

    // Validate required fields
    if (!propertyId || !agencyId || !type || commissionRate === undefined || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Champs requis manquants : propertyId, agencyId, type, commissionRate, startDate, endDate' },
        { status: 400 }
      )
    }

    // Validate mandat type
    const validTypes = ['GESTION_COMPLETE', 'GESTION_LOCATION', 'MANDAT_SIMPLE']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type invalide. Valeurs acceptées : ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify the property belongs to the owner
    const property = await db.property.findUnique({
      where: { id: propertyId },
    })
    if (!property) {
      return NextResponse.json({ error: 'Propriété introuvable' }, { status: 404 })
    }
    if (property.ownerId !== userId) {
      return NextResponse.json({ error: 'Cette propriété ne vous appartient pas' }, { status: 403 })
    }

    // Verify the agency exists and has AGENCE role
    const agency = await db.user.findUnique({
      where: { id: agencyId },
    })
    if (!agency || (agency.role !== 'AGENCE' && agency.activeRole !== 'AGENCE')) {
      return NextResponse.json({ error: 'Agence introuvable ou invalide' }, { status: 404 })
    }

    // Check for existing active mandat on this property
    const existingMandat = await db.mandat.findFirst({
      where: {
        propertyId,
        status: { in: ['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE'] },
      },
    })
    if (existingMandat) {
      return NextResponse.json(
        { error: 'Un mandat actif ou en attente existe déjà pour cette propriété' },
        { status: 409 }
      )
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (start >= end) {
      return NextResponse.json({ error: 'La date de début doit être antérieure à la date de fin' }, { status: 400 })
    }

    const mandat = await db.mandat.create({
      data: {
        type,
        status: 'DRAFT',
        commissionRate: parseFloat(String(commissionRate)),
        startDate: start,
        endDate: end,
        conditions: conditions || null,
        propertyId,
        ownerId: userId,
        agencyId,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            address: true,
            type: true,
          },
        },
        agency: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Notify the agency about the new mandat
    await notify({
      userId: agencyId,
      type: 'LEASE_UPDATE',
      title: 'Nouveau mandat reçu',
      message: `Le propriétaire a créé un mandat de gestion pour "${mandat.property.title}". En attente de votre signature.`,
      actionUrl: 'mandats',
      entityId: mandat.id,
    })

    return NextResponse.json({ mandat }, { status: 201 })
  } catch (error) {
    console.error('Create mandat error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
