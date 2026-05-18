import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notifyFraudAlert } from '@/lib/notify'

// Helper: authenticate and authorize TC
async function authorizeTC(request: NextRequest) {
  const auth = await getUserIdAndRole(request)
  if (!auth) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  if (auth.effectiveRole !== 'TIERS_CONFIANCE')
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { userId: auth.userId }
}

// ─── GET ────────────────────────────────────────────────────────────────────────
// List fraud alerts with filters
export async function GET(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')?.trim()

  const where: Record<string, unknown> = {
    reporterId: userId,
  }

  if (status && status !== 'ALL') {
    where.status = status
  }

  if (search) {
    where.OR = [
      { suspect: { firstName: { contains: search } } },
      { suspect: { lastName: { contains: search } } },
      { suspect: { email: { contains: search } } },
      { description: { contains: search } },
    ]
  }

  const alerts = await db.fraudAlert.findMany({
    where,
    include: {
      suspect: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
      reporter: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Stats
  const stats = await db.fraudAlert.groupBy({
    by: ['status'],
    where: { reporterId: userId },
    _count: { status: true },
  })

  const statsMap: Record<string, number> = { OPEN: 0, INVESTIGATING: 0, CONFIRMED: 0, DISMISSED: 0 }
  for (const s of stats) {
    statsMap[s.status] = s._count.status
  }

  return NextResponse.json({ alerts, stats: statsMap })
}

// ─── POST ───────────────────────────────────────────────────────────────────────
// Create a new fraud alert
export async function POST(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  try {
    const body = await request.json()
    const { suspectId, description, autoDetected } = body

    if (!suspectId || typeof suspectId !== 'string') {
      return NextResponse.json({ error: "Le suspect est requis" }, { status: 400 })
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'La description est requise' }, { status: 400 })
    }

    // Verify suspect exists
    const suspect = await db.user.findUnique({ where: { id: suspectId } })
    if (!suspect) {
      return NextResponse.json({ error: 'Suspect introuvable' }, { status: 404 })
    }

    const alert = await db.fraudAlert.create({
      data: {
        suspectId,
        reporterId: userId,
        description: description.trim(),
        autoDetected: autoDetected === true,
        status: 'OPEN',
      },
      include: {
        suspect: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId,
        action: 'FRAUD_ALERT_CREATED',
        entity: 'FraudAlert',
        entityId: alert.id,
        details: JSON.stringify({ suspectId, description: description.trim() }),
      },
    })

    // Notify all other TC agents about the new fraud alert
    const tcUsers = await db.user.findMany({
      where: {
        role: 'TIERS_CONFIANCE',
        isActive: true,
        id: { not: userId },
      },
      select: { id: true },
    })
    const suspectName = `${suspect.firstName} ${suspect.lastName}`
    await Promise.all(
      tcUsers.map((tc) =>
        notifyFraudAlert(tc.id, suspectName, alert.id)
      )
    )

    return NextResponse.json(alert, { status: 201 })
  } catch (error) {
    console.error('[TC Fraud Alerts POST] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────────
// Update fraud alert status (OPEN→INVESTIGATING, INVESTIGATING→CONFIRMED/DISMISSED)
export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  try {
    const body = await request.json()
    const { id, action, resolution } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "L'identifiant est requis" }, { status: 400 })
    }

    if (!action || !['INVESTIGATE', 'CONFIRM', 'DISMISS'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const alert = await db.fraudAlert.findUnique({ where: { id } })
    if (!alert) {
      return NextResponse.json({ error: 'Alerte introuvable' }, { status: 404 })
    }

    if (alert.reporterId !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    let newStatus: string
    let auditAction: string

    switch (action) {
      case 'INVESTIGATE':
        if (alert.status !== 'OPEN') {
          return NextResponse.json({ error: 'Seules les alertes ouvertes peuvent être investiguées' }, { status: 400 })
        }
        newStatus = 'INVESTIGATING'
        auditAction = 'FRAUD_ALERT_INVESTIGATING'
        break

      case 'CONFIRM':
        if (alert.status !== 'INVESTIGATING') {
          return NextResponse.json({ error: 'Seules les alertes en investigation peuvent être confirmées' }, { status: 400 })
        }
        newStatus = 'CONFIRMED'
        auditAction = 'FRAUD_ALERT_CONFIRMED'
        break

      case 'DISMISS':
        if (alert.status !== 'INVESTIGATING') {
          return NextResponse.json({ error: 'Seules les alertes en investigation peuvent être écartées' }, { status: 400 })
        }
        newStatus = 'DISMISSED'
        auditAction = 'FRAUD_ALERT_DISMISSED'
        break

      default:
        return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status: newStatus }
    if (resolution) {
      updateData.resolution = resolution.trim()
    }

    const updated = await db.fraudAlert.update({
      where: { id },
      data: updateData,
      include: {
        suspect: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId,
        action: auditAction,
        entity: 'FraudAlert',
        entityId: id,
        details: JSON.stringify({ suspectId: alert.suspectId, newStatus, resolution }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[TC Fraud Alerts PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
