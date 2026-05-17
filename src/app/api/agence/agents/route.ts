import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const agents = await db.agencyAgent.findMany({
      where: { agencyId: userId },
      include: {
        assignedProperties: {
          include: {
            property: { select: { id: true, title: true, city: true, status: true } },
          },
        },
        commissions: {
          where: { status: 'PAID' },
          select: { amount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const agentsWithStats = agents.map((agent) => ({
      id: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      phone: agent.phone,
      role: agent.role,
      status: agent.status,
      avatarUrl: agent.avatarUrl,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      assignedPropertiesCount: agent.assignedProperties.length,
      assignedProperties: agent.assignedProperties.map((ap) => ({
        id: ap.id,
        propertyId: ap.property.id,
        propertyTitle: ap.property.title,
        propertyCity: ap.property.city,
        propertyStatus: ap.property.status,
        assignedAt: ap.assignedAt,
      })),
      totalCommissions: agent.commissions.reduce((sum, c) => sum + c.amount, 0),
    }))

    return NextResponse.json({ agents: agentsWithStats })
  } catch (error) {
    console.error('Get agents error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { firstName, lastName, email, phone, role } = body

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'Prénom, nom et email sont requis' }, { status: 400 })
    }

    // Check if email already exists
    const existing = await db.agencyAgent.findFirst({
      where: { email, agencyId: userId },
    })
    if (existing) {
      return NextResponse.json({ error: 'Un agent avec cet email existe déjà' }, { status: 409 })
    }

    const agent = await db.agencyAgent.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        role: role || 'AGENT',
        status: 'ACTIVE',
        agencyId: userId,
      },
    })

    return NextResponse.json({ agent }, { status: 201 })
  } catch (error) {
    console.error('Create agent error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
