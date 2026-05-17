import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/owner/reviews — Reviews received + leases eligible for review (owner perspective)
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

    // 1. Reviews received by this owner
    const reviewsReceived = await db.rating.findMany({
      where: { toUserId: userId },
      include: {
        fromUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        lease: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            property: {
              select: { id: true, title: true, address: true, city: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 2. Reviews given by this owner
    const reviewsGiven = await db.rating.findMany({
      where: { fromUserId: userId },
      include: {
        toUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        lease: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            property: {
              select: { id: true, title: true, address: true, city: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 3. Completed/terminated leases where owner hasn't left a review yet
    const completedLeases = await db.lease.findMany({
      where: {
        ownerId: userId,
        status: { in: ['TERMINATED', 'EXPIRED', 'ACTIVE'] },
      },
      include: {
        tenant: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        property: {
          select: { id: true, title: true, address: true, city: true },
        },
        ratings: {
          where: { fromUserId: userId },
          select: { id: true },
        },
      },
      orderBy: { endDate: 'desc' },
    })

    // Filter to only leases where owner hasn't given a review
    const leasesToReview = completedLeases
      .filter((l) => l.ratings.length === 0)
      .map((l) => ({
        id: l.id,
        startDate: l.startDate,
        endDate: l.endDate,
        status: l.status,
        tenant: l.tenant,
        property: l.property,
      }))

    // Stats
    const receivedScores = reviewsReceived.map((r) => r.score)
    const averageScoreReceived = receivedScores.length > 0
      ? Math.round((receivedScores.reduce((s, v) => s + v, 0) / receivedScores.length) * 10) / 10
      : 0

    return NextResponse.json({
      data: {
        received: reviewsReceived,
        given: reviewsGiven,
        leasesToReview,
      },
      stats: {
        receivedCount: reviewsReceived.length,
        givenCount: reviewsGiven.length,
        averageScoreReceived,
        pendingReviews: leasesToReview.length,
      },
    })
  } catch (error) {
    console.error('Owner reviews GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
