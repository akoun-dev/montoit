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

  const agentsRaw = await db.verificationAgent.findMany({
    where,
    include: {
      missions: {
        select: {
          id: true,
          status: true,
          type: true,
          scheduledAt: true,
          completedAt: true,
          createdAt: true,
          reportUrl: true,
          notes: true,
          property: {
            select: { id: true, title: true, address: true, city: true },
          },
        },
        orderBy: { scheduledAt: 'desc' },
      },
      feedbacks: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { missions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Compute enhanced data for each agent
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const agents = agentsRaw.map((agent) => {
    const completedMissions = agent.missions.filter((m) => m.status === 'COMPLETED')
    const totalMissions = agent.missions.length
    const successRate = totalMissions > 0
      ? Math.round((completedMissions.length / totalMissions) * 100)
      : 0

    // Average completion time (hours from created to completed)
    let avgCompletionHours = 0
    if (completedMissions.length > 0) {
      const totalHours = completedMissions.reduce((sum, m) => {
        if (m.completedAt && m.createdAt) {
          return sum + (new Date(m.completedAt).getTime() - new Date(m.createdAt).getTime()) / (1000 * 60 * 60)
        }
        return sum
      }, 0)
      avgCompletionHours = Math.round(totalHours / completedMissions.length)
    }

    // Last mission date
    const lastMission = completedMissions.length > 0
      ? completedMissions.sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0]
      : null

    // Upcoming missions (next 7 days)
    const upcomingMissions = agent.missions.filter((m) => {
      const schedDate = new Date(m.scheduledAt)
      return schedDate >= now && schedDate <= sevenDaysFromNow && (m.status === 'ASSIGNED' || m.status === 'IN_PROGRESS')
    })

    // Average rating
    const avgRating = agent.feedbacks.length > 0
      ? Math.round((agent.feedbacks.reduce((sum, f) => sum + f.rating, 0) / agent.feedbacks.length) * 10) / 10
      : 0

    // Completed mission reports
    const reports = completedMissions
      .filter((m) => m.reportUrl)
      .map((m) => ({
        id: m.id,
        reportUrl: m.reportUrl,
        propertyTitle: m.property.title,
        completedAt: m.completedAt,
      }))

    return {
      id: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      phone: agent.phone,
      isActive: agent.isActive,
      createdAt: agent.createdAt,
      _count: agent._count,
      // Performance metrics (US-TA-053)
      performance: {
        totalMissions,
        completedCount: completedMissions.length,
        successRate,
        avgCompletionHours,
        lastMissionDate: lastMission?.completedAt || null,
      },
      // Feedback (US-TA-055)
      feedbackSummary: {
        avgRating,
        totalFeedbacks: agent.feedbacks.length,
        recentFeedbacks: agent.feedbacks.slice(0, 3),
      },
      // Availability (US-TA-056)
      availability: {
        upcomingMissions: upcomingMissions.map((m) => ({
          id: m.id,
          scheduledAt: m.scheduledAt,
          status: m.status,
          type: m.type,
          propertyTitle: m.property.title,
        })),
        missionCountNext7Days: upcomingMissions.length,
      },
      // Reports (US-TA-054)
      reports,
    }
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

    // Check email uniqueness scoped to this TC (tcId + email unique constraint)
    const existing = await db.verificationAgent.findFirst({
      where: { tcId: userId, email: trimmedEmail },
    })

    if (existing) {
      // If the existing agent is soft-deleted, re-activate it with new data
      if (!existing.isActive) {
        const reactivated = await db.verificationAgent.update({
          where: { id: existing.id },
          data: {
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            phone: phone?.trim() || null,
            isActive: true,
          },
        })
        return NextResponse.json(reactivated, { status: 201 })
      }
      return NextResponse.json(
        { error: 'Un agent avec cet email existe déjà dans votre équipe' },
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

    // If email is being changed, check uniqueness scoped to this TC
    if (email && email.trim().toLowerCase() !== agent.email) {
      const existing = await db.verificationAgent.findFirst({
        where: {
          tcId: userId,
          email: email.trim().toLowerCase(),
          id: { not: id },
        },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Un agent avec cet email existe déjà dans votre équipe' },
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
