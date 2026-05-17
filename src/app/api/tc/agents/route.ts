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
// List all verification agents for the current TC
export async function GET(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim()
  const isActive = searchParams.get('isActive')

  const where: Record<string, unknown> = {
    tcId: userId,
  }

  if (isActive === 'true') {
    where.isActive = true
  } else if (isActive === 'false') {
    where.isActive = false
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ]
  }

  const agents = await db.verificationAgent.findMany({
    where,
    include: {
      _count: {
        select: { missions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(agents)
}

// ─── POST ───────────────────────────────────────────────────────────────────────
// Create a new verification agent
export async function POST(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  try {
    const body = await request.json()
    const { firstName, lastName, email, phone } = body

    // Validate required fields
    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return NextResponse.json({ error: 'Le prénom est requis' }, { status: 400 })
    }
    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: "L'email est requis" }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()

    // Check email uniqueness
    const existing = await db.verificationAgent.findUnique({
      where: { email: trimmedEmail },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Un agent avec cet email existe déjà' },
        { status: 409 }
      )
    }

    const agent = await db.verificationAgent.create({
      data: {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        phone: phone?.trim() || null,
        tcId: userId,
      },
    })

    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    console.error('[TC Agents POST] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────────
// Update an agent
export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  try {
    const body = await request.json()
    const { id, firstName, lastName, email, phone, isActive } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "L'identifiant de l'agent est requis" }, { status: 400 })
    }

    // Verify the agent belongs to this TC
    const agent = await db.verificationAgent.findUnique({
      where: { id },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })
    }

    if (agent.tcId !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // If email is being changed, check uniqueness
    if (email && email.trim().toLowerCase() !== agent.email) {
      const existing = await db.verificationAgent.findUnique({
        where: { email: email.trim().toLowerCase() },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Un agent avec cet email existe déjà' },
          { status: 409 }
        )
      }
    }

    // If deactivating, cancel any ASSIGNED/IN_PROGRESS missions
    if (isActive === false && agent.isActive === true) {
      const activeMissions = await db.mission.findMany({
        where: {
          agentId: id,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        },
      })

      if (activeMissions.length > 0) {
        await db.mission.updateMany({
          where: {
            agentId: id,
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
          },
          data: { status: 'CANCELLED' },
        })
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (firstName !== undefined) updateData.firstName = firstName.trim()
    if (lastName !== undefined) updateData.lastName = lastName.trim()
    if (email !== undefined) updateData.email = email.trim().toLowerCase()
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await db.verificationAgent.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { missions: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[TC Agents PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────────────
// Soft-delete an agent (set isActive=false)
export async function DELETE(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  try {
    const body = await request.json()
    const { id } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "L'identifiant de l'agent est requis" }, { status: 400 })
    }

    // Verify the agent belongs to this TC
    const agent = await db.verificationAgent.findUnique({
      where: { id },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })
    }

    if (agent.tcId !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Cancel any active missions first
    await db.mission.updateMany({
      where: {
        agentId: id,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      },
      data: { status: 'CANCELLED' },
    })

    // Soft delete
    const updated = await db.verificationAgent.update({
      where: { id },
      data: { isActive: false },
      include: {
        _count: {
          select: { missions: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[TC Agents DELETE] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
