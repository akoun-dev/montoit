import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// Helper: authenticate and authorize TC
async function authorizeTC(request: NextRequest) {
  const auth = await getUserIdAndRole(request)
  if (!auth) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  if (auth.effectiveRole !== 'TIERS_CONFIANCE')
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { userId: auth.userId }
}

// ─── GET ────────────────────────────────────────────────────────────────────────
// List all missions for the current TC
export async function GET(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const agentId = searchParams.get('agentId')
  const propertyId = searchParams.get('propertyId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const calendar = searchParams.get('calendar') === 'true'

  const where: Record<string, unknown> = {
    tcId: userId,
  }

  if (status) where.status = status
  if (agentId) where.agentId = agentId
  if (propertyId) where.propertyId = propertyId

  if (dateFrom || dateTo) {
    const scheduledAt: Record<string, Date> = {}
    if (dateFrom) scheduledAt.gte = new Date(dateFrom)
    if (dateTo) scheduledAt.lte = new Date(dateTo)
    where.scheduledAt = scheduledAt
  }

  const missions = await db.mission.findMany({
    where,
    include: {
      agent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          address: true,
          city: true,
          type: true,
          images: {
            select: { id: true, url: true, order: true },
            orderBy: { order: 'asc' },
          },
        },
      },
      inventoryReport: {
        select: {
          id: true,
          type: true,
          status: true,
          completedAt: true,
        },
      },
    },
    orderBy: { scheduledAt: 'desc' },
  })

  // Calendar view: group missions by date
  if (calendar) {
    const grouped: Record<string, typeof missions> = {}
    for (const mission of missions) {
      const dateKey = new Date(mission.scheduledAt).toISOString().split('T')[0]
      if (!grouped[dateKey]) grouped[dateKey] = []
      grouped[dateKey].push(mission)
    }
    return NextResponse.json({ calendar: grouped })
  }

  return NextResponse.json(missions)
}

// ─── POST ───────────────────────────────────────────────────────────────────────
// Create a new mission
export async function POST(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  try {
    const body = await request.json()
    const { propertyId, agentId, type, scheduledAt, notes } = body

    // Validate required fields
    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: "L'identifiant de la propriété est requis" }, { status: 400 })
    }
    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: "L'identifiant de l'agent est requis" }, { status: 400 })
    }
    if (!type || !['PROPERTY_VERIFICATION', 'INVENTORY_REPORT'].includes(type)) {
      return NextResponse.json(
        { error: 'Le type de mission doit être PROPERTY_VERIFICATION ou INVENTORY_REPORT' },
        { status: 400 }
      )
    }
    if (!scheduledAt) {
      return NextResponse.json({ error: 'La date planifiée est requise' }, { status: 400 })
    }

    const scheduledDate = new Date(scheduledAt)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Date planifiée invalide' }, { status: 400 })
    }

    // Verify the agent belongs to this TC and is active
    const agent = await db.verificationAgent.findUnique({
      where: { id: agentId },
    })
    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })
    }
    if (agent.tcId !== userId) {
      return NextResponse.json({ error: 'Cet agent ne vous appartient pas' }, { status: 403 })
    }
    if (!agent.isActive) {
      return NextResponse.json({ error: 'Cet agent est inactif' }, { status: 400 })
    }

    // Verify the property exists and is in PENDING_VERIFICATION status
    const property = await db.property.findUnique({
      where: { id: propertyId },
    })
    if (!property) {
      return NextResponse.json({ error: 'Propriété introuvable' }, { status: 404 })
    }
    if (property.status !== 'PENDING_VERIFICATION') {
      return NextResponse.json(
        { error: 'La propriété doit être en attente de vérification pour créer une mission' },
        { status: 400 }
      )
    }

    const mission = await db.mission.create({
      data: {
        propertyId,
        agentId,
        type,
        scheduledAt: scheduledDate,
        notes: notes?.trim() || null,
        tcId: userId,
      },
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
          },
        },
      },
    })

    // Notify the property owner
    const propertyOwner = await db.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true, title: true },
    })
    if (propertyOwner) {
      await db.notification.create({
        data: {
          userId: propertyOwner.ownerId,
          type: 'VERIFICATION_RESULT',
          title: 'Vérification programmée pour votre bien',
          message: `Une vérification sur place a été programmée pour votre bien "${propertyOwner.title}".`,
          entityId: mission.id,
        },
      })
    }

    return NextResponse.json(mission, { status: 201 })
  } catch (error) {
    console.error('[TC Missions POST] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────────
// Update a mission status
export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  try {
    const body = await request.json()
    const { id, status, notes, reportUrl } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "L'identifiant de la mission est requis" }, { status: 400 })
    }
    if (!status || !['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    // Verify the mission belongs to this TC
    const mission = await db.mission.findUnique({
      where: { id },
    })

    if (!mission) {
      return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 })
    }
    if (mission.tcId !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Validate status transitions
    const currentStatus = mission.status
    const validTransitions: Record<string, string[]> = {
      ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    }

    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        { error: `Transition de statut invalide : ${currentStatus} → ${status}` },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = { status }
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (reportUrl !== undefined) updateData.reportUrl = reportUrl?.trim() || null

    // When completing: set completedAt
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date()
    }

    // When completing PROPERTY_VERIFICATION: also update property
    if (status === 'COMPLETED' && mission.type === 'PROPERTY_VERIFICATION') {
      await db.property.update({
        where: { id: mission.propertyId },
        data: {
          isVerified: true,
          status: 'ACTIVE',
        },
      })
    }

    const updated = await db.mission.update({
      where: { id },
      data: updateData,
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
          },
        },
        inventoryReport: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[TC Missions PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
