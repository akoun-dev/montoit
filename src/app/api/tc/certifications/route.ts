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
// List certifications with filters
export async function GET(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const search = searchParams.get('search')?.trim()

  const where: Record<string, unknown> = {
    grantedById: userId,
  }

  if (status && status !== 'ALL') {
    where.status = status
  }

  if (type && type !== 'ALL') {
    where.type = type
  }

  if (search) {
    where.OR = [
      { user: { firstName: { contains: search } } },
      { user: { lastName: { contains: search } } },
      { user: { email: { contains: search } } },
      { notes: { contains: search } },
    ]
  }

  const certifications = await db.certification.findMany({
    where,
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      grantedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      property: {
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Stats
  const stats = await db.certification.groupBy({
    by: ['status'],
    where: { grantedById: userId },
    _count: { status: true },
  })

  const statsMap: Record<string, number> = { PENDING: 0, GRANTED: 0, REVOKED: 0, EXPIRED: 0 }
  for (const s of stats) {
    statsMap[s.status] = s._count.status
  }
  statsMap.TOTAL = Object.values(statsMap).reduce((a, b) => a + b, 0)

  return NextResponse.json({ certifications, stats: statsMap })
}

// ─── POST ───────────────────────────────────────────────────────────────────────
// Create a new certification
export async function POST(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  try {
    const body = await request.json()
    const { userId: targetUserId, type, notes, expiresAt, propertyId } = body

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: "L'utilisateur est requis" }, { status: 400 })
    }
    if (!type || !['USER_IDENTITY', 'PROPERTY', 'AGENCY'].includes(type)) {
      return NextResponse.json({ error: 'Le type de certification est invalide' }, { status: 400 })
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: targetUserId } })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // For PROPERTY type, verify propertyId
    if (type === 'PROPERTY' && propertyId) {
      const property = await db.property.findUnique({ where: { id: propertyId } })
      if (!property) {
        return NextResponse.json({ error: 'Bien immobilier introuvable' }, { status: 404 })
      }
    }

    const certification = await db.certification.create({
      data: {
        userId: targetUserId,
        grantedById: userId,
        type,
        notes: notes?.trim() || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        propertyId: type === 'PROPERTY' ? propertyId || null : null,
        status: 'PENDING',
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        grantedBy: { select: { id: true, firstName: true, lastName: true } },
        property: { select: { id: true, title: true } },
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId,
        action: 'CERTIFICATION_CREATED',
        entity: 'Certification',
        entityId: certification.id,
        details: JSON.stringify({ type, targetUserId }),
      },
    })

    return NextResponse.json(certification, { status: 201 })
  } catch (error) {
    console.error('[TC Certifications POST] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────────
// Grant or revoke a certification
export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  try {
    const body = await request.json()
    const { id, action, revocationReason } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "L'identifiant est requis" }, { status: 400 })
    }

    if (!action || !['GRANT', 'REVOKE'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide (GRANT ou REVOKE)' }, { status: 400 })
    }

    const cert = await db.certification.findUnique({ where: { id } })
    if (!cert) {
      return NextResponse.json({ error: 'Certification introuvable' }, { status: 404 })
    }

    if (cert.grantedById !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (action === 'GRANT') {
      if (cert.status !== 'PENDING') {
        return NextResponse.json({ error: 'Seules les certifications en attente peuvent être accordées' }, { status: 400 })
      }

      const updated = await db.certification.update({
        where: { id },
        data: { status: 'GRANTED' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          grantedBy: { select: { id: true, firstName: true, lastName: true } },
          property: { select: { id: true, title: true } },
        },
      })

      // Create audit log
      await db.auditLog.create({
        data: {
          userId,
          action: 'CERTIFICATION_GRANTED',
          entity: 'Certification',
          entityId: id,
          details: JSON.stringify({ type: cert.type, targetUserId: cert.userId }),
        },
      })

      // Create notification for user
      await db.notification.create({
        data: {
          userId: cert.userId,
          type: 'VERIFICATION_RESULT',
          title: 'Certification accordée',
          message: `Votre certification ${cert.type === 'USER_IDENTITY' ? "d'identité" : cert.type === 'PROPERTY' ? 'de bien immobilier' : "d'agence"} a été accordée.`,
          entityId: id,
        },
      })

      return NextResponse.json(updated)
    }

    if (action === 'REVOKE') {
      if (cert.status !== 'GRANTED') {
        return NextResponse.json({ error: 'Seules les certifications accordées peuvent être révoquées' }, { status: 400 })
      }

      const updated = await db.certification.update({
        where: { id },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revocationReason: revocationReason?.trim() || null,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          grantedBy: { select: { id: true, firstName: true, lastName: true } },
          property: { select: { id: true, title: true } },
        },
      })

      // Create audit log
      await db.auditLog.create({
        data: {
          userId,
          action: 'CERTIFICATION_REVOKED',
          entity: 'Certification',
          entityId: id,
          details: JSON.stringify({ type: cert.type, targetUserId: cert.userId, revocationReason }),
        },
      })

      // Create notification for user
      await db.notification.create({
        data: {
          userId: cert.userId,
          type: 'VERIFICATION_RESULT',
          title: 'Certification révoquée',
          message: `Votre certification ${cert.type === 'USER_IDENTITY' ? "d'identité" : cert.type === 'PROPERTY' ? 'de bien immobilier' : "d'agence"} a été révoquée.${revocationReason ? ` Raison : ${revocationReason}` : ''}`,
          entityId: id,
        },
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
  } catch (error) {
    console.error('[TC Certifications PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
