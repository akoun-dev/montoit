import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/reviews — List ratings given and received for current tenant + stats
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const direction = searchParams.get('direction') || 'all' // 'given', 'received', or 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    // Fetch ratings given (by this user)
    const givenWhere = { fromUserId: userId }
    // Fetch ratings received (to this user)
    const receivedWhere = { toUserId: userId }

    const [ratingsGiven, ratingsReceived, givenCount, receivedCount] = await Promise.all([
      (direction === 'all' || direction === 'given')
        ? db.rating.findMany({
            where: givenWhere,
            include: {
              lease: {
                select: {
                  id: true,
                  startDate: true,
                  endDate: true,
                  property: {
                    select: {
                      id: true,
                      title: true,
                      address: true,
                      city: true,
                    },
                  },
                },
              },
              toUser: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            ...(direction === 'given' ? { skip: (page - 1) * limit, take: limit } : {}),
          })
        : [],
      (direction === 'all' || direction === 'received')
        ? db.rating.findMany({
            where: receivedWhere,
            include: {
              lease: {
                select: {
                  id: true,
                  startDate: true,
                  endDate: true,
                  property: {
                    select: {
                      id: true,
                      title: true,
                      address: true,
                      city: true,
                    },
                  },
                },
              },
              fromUser: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            ...(direction === 'received' ? { skip: (page - 1) * limit, take: limit } : {}),
          })
        : [],
      db.rating.count({ where: givenWhere }),
      db.rating.count({ where: receivedWhere }),
    ])

    // Compute average score received
    const receivedScores = await db.rating.findMany({
      where: receivedWhere,
      select: { score: true },
    })
    const averageScoreReceived = receivedScores.length > 0
      ? receivedScores.reduce((sum, r) => sum + r.score, 0) / receivedScores.length
      : 0

    // Compute pagination for directional queries
    const pagination =
      direction === 'given'
        ? { page, limit, total: givenCount, totalPages: Math.ceil(givenCount / limit) }
        : direction === 'received'
          ? { page, limit, total: receivedCount, totalPages: Math.ceil(receivedCount / limit) }
          : { page: 1, limit: 0, total: givenCount + receivedCount, totalPages: 1 }

    return NextResponse.json({
      data: {
        given: ratingsGiven,
        received: ratingsReceived,
      },
      stats: {
        givenCount,
        receivedCount,
        averageScoreReceived: Math.round(averageScoreReceived * 10) / 10,
      },
      pagination,
    })
  } catch (error) {
    console.error('Reviews GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
