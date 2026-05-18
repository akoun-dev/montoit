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
// List users with ONECI/NeoFace verification status
export async function GET(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') || 'ALL'
  const search = searchParams.get('search')?.trim()

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ]
  }

  switch (filter) {
    case 'ONECI_VERIFIED':
      where.oneciVerified = true
      break
    case 'ONECI_PENDING':
      where.oneciVerified = false
      break
    case 'NEOFACE_VERIFIED':
      where.neofaceVerified = true
      break
    case 'NEOFACE_PENDING':
      where.neofaceVerified = false
      break
  }

  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      nni: true,
      oneciVerified: true,
      oneciVerifiedAt: true,
      neofaceVerified: true,
      neofaceVerifiedAt: true,
      role: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Stats
  const totalUsers = await db.user.count()
  const oneciVerifiedCount = await db.user.count({ where: { oneciVerified: true } })
  const neofaceVerifiedCount = await db.user.count({ where: { neofaceVerified: true } })
  const oneciPendingCount = await db.user.count({ where: { oneciVerified: false } })
  const neofacePendingCount = await db.user.count({ where: { neofaceVerified: false } })

  return NextResponse.json({
    users,
    stats: {
      totalUsers,
      oneciVerified: oneciVerifiedCount,
      neofaceVerified: neofaceVerifiedCount,
      oneciPending: oneciPendingCount,
      neofacePending: neofacePendingCount,
    },
  })
}

// ─── PATCH ──────────────────────────────────────────────────────────────────────
// Verify or reject ONECI/NeoFace for a user
export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId: tcUserId } = auth

  try {
    const body = await request.json()
    const { userId, action, comment } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: "L'identifiant utilisateur est requis" }, { status: 400 })
    }

    if (!action || !['VERIFY_ONECI', 'REJECT_ONECI', 'VERIFY_NEOFACE', 'REJECT_NEOFACE'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    switch (action) {
      case 'VERIFY_ONECI':
        updateData.oneciVerified = true
        updateData.oneciVerifiedAt = new Date()
        break
      case 'REJECT_ONECI':
        updateData.oneciVerified = false
        updateData.oneciVerifiedAt = null
        break
      case 'VERIFY_NEOFACE':
        updateData.neofaceVerified = true
        updateData.neofaceVerifiedAt = new Date()
        break
      case 'REJECT_NEOFACE':
        updateData.neofaceVerified = false
        updateData.neofaceVerifiedAt = null
        break
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        nni: true,
        oneciVerified: true,
        oneciVerifiedAt: true,
        neofaceVerified: true,
        neofaceVerifiedAt: true,
        role: true,
      },
    })

    // Create audit log
    const actionLabel = action.startsWith('VERIFY') ? 'vérifiée' : 'rejetée'
    const typeLabel = action.includes('ONECI') ? 'ONECI' : 'NeoFace'
    await db.auditLog.create({
      data: {
        userId: tcUserId,
        action: `ONECI_${action}`,
        entity: 'User',
        entityId: userId,
        details: JSON.stringify({ action, comment, type: typeLabel }),
      },
    })

    // Create notification for user
    const isVerified = action.startsWith('VERIFY')
    await db.notification.create({
      data: {
        userId,
        type: 'VERIFICATION_RESULT',
        title: `Vérification ${typeLabel} ${isVerified ? 'confirmée' : 'rejetée'}`,
        message: isVerified
          ? `Votre vérification ${typeLabel} a été ${actionLabel}.`
          : `Votre vérification ${typeLabel} a été rejetée.${comment ? ` Commentaire : ${comment}` : ''}`,
        entityId: userId,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[TC ONECI PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
