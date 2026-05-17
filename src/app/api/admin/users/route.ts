import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/admin/users — list all users with stats
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (authResult.effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const url = new URL(req.url)
    const search = url.searchParams.get('search')
    const role = url.searchParams.get('role')
    const sortBy = url.searchParams.get('sortBy') || 'createdAt'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'

    const where: Record<string, unknown> = {}
    if (role) where.role = role
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const users = await db.user.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        activeRole: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        avatarUrl: true,
      },
    })

    const totalUsers = await db.user.count()
    const activeUsers = await db.user.count({ where: { isActive: true } })
    const inactiveUsers = totalUsers - activeUsers
    const usersByRole = await db.user.groupBy({
      by: ['role'],
      _count: { role: true },
    })

    return NextResponse.json({
      users,
      stats: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        byRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = item._count.role
          return acc
        }, {} as Record<string, number>),
      },
    })
  } catch (error) {
    console.error('Admin users GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/admin/users — update user (role change, ban/suspend, reactivate)
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (authResult.effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, role, isActive } = body

    if (!userId) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 })
    }

    // Prevent self-modification
    if (userId === authResult.userId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas modifier votre propre compte' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (role) {
      updateData.role = role
      updateData.activeRole = role
    }
    if (isActive !== undefined) updateData.isActive = isActive

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        activeRole: true,
        isActive: true,
        createdAt: true,
      },
    })

    // Log the admin action
    await db.auditLog.create({
      data: {
        action: isActive === false ? 'USER_BANNED' : role ? 'USER_ROLE_CHANGED' : 'USER_REACTIVATED',
        entity: 'User',
        entityId: userId,
        details: JSON.stringify({ role, isActive, modifiedBy: authResult.userId }),
        userId: authResult.userId,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Admin users PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
