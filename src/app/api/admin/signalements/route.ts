import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// GET /api/admin/signalements — list signalements with reporter info
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { effectiveRole } = authResult

    if (effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const reason = url.searchParams.get('reason')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (reason) where.reason = reason

    const signalements = await db.signalement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        handledBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    const stats = await db.signalement.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    const statsByReason = await db.signalement.groupBy({
      by: ['reason'],
      _count: { reason: true },
    })

    return NextResponse.json({
      signalements,
      stats: {
        byStatus: stats.reduce((acc, item) => {
          acc[item.status] = item._count.status
          return acc
        }, {} as Record<string, number>),
        byReason: statsByReason.reduce((acc, item) => {
          acc[item.reason] = item._count.reason
          return acc
        }, {} as Record<string, number>),
      },
    })
  } catch (error) {
    console.error('Admin signalements GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/admin/signalements — create new signalement
export async function POST(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { reason, description, entityType, entityId, reporterId } = body

    if (!reason || !description || !entityType || !entityId || !reporterId) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const signalement = await db.signalement.create({
      data: {
        reason,
        description,
        entityType,
        entityId,
        reporterId,
      },
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    })

    // Notify all admin users about the new signalement
    const admins = await db.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    })
    await Promise.all(admins.map((admin) =>
      notify({
        userId: admin.id,
        type: 'SYSTEM',
        title: 'Nouveau signalement',
        message: `Un signalement a été déposé : ${reason}`,
        actionUrl: 'signalements',
        entityId: signalement.id,
      })
    ))

    return NextResponse.json({ signalement }, { status: 201 })
  } catch (error) {
    console.error('Admin signalements POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/admin/signalements — update signalement status/notes
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { id, status, adminNotes, resolution } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes
    if (resolution !== undefined) updateData.resolution = resolution
    updateData.handledById = userId

    const signalement = await db.signalement.update({
      where: { id },
      data: updateData,
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        handledBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    // Notify the reporter about the status update
    if (status) {
      const statusLabels: Record<string, string> = {
        REVIEWED: 'en cours d\'examen',
        RESOLVED: 'résolu',
        DISMISSED: 'rejeté',
      }
      await notify({
        userId: signalement.reporterId,
        type: 'SYSTEM',
        title: 'Mise à jour de votre signalement',
        message: `Votre signalement a été ${statusLabels[status] || 'mis à jour'}.${adminNotes ? ` Note : ${adminNotes}` : ''}`,
        actionUrl: 'history',
        entityId: id,
      })
    }

    return NextResponse.json({ signalement })
  } catch (error) {
    console.error('Admin signalements PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
