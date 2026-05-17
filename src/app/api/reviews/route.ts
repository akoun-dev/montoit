import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/reviews — List ratings given and received for current user + stats
// Supports both LOCATAIRE and PROPRIETAIRE roles
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
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

// POST /api/reviews — Create a review/rating (LOCATAIRE or PROPRIETAIRE)
export async function POST(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Seuls les locataires et propriétaires peuvent laisser un avis' }, { status: 403 })
    }

    const body = await req.json()
    const { leaseId, toUserId, score, comment, propertyId } = body as {
      leaseId?: string
      toUserId?: string
      score?: number
      comment?: string
      propertyId?: string
    }

    // Validate required fields
    if (!leaseId || !toUserId || !score) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants: leaseId, toUserId, score' },
        { status: 400 }
      )
    }

    // Validate score range
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return NextResponse.json(
        { error: 'La note doit être un entier entre 1 et 5' },
        { status: 400 }
      )
    }

    // For LOCATAIRE: validate the lease belongs to this tenant
    // For PROPRIETAIRE: validate the lease belongs to this owner
    const leaseWhere = effectiveRole === 'LOCATAIRE'
      ? { id: leaseId, tenantId: userId }
      : { id: leaseId, ownerId: userId }

    const lease = await db.lease.findFirst({
      where: leaseWhere,
      include: {
        property: { select: { id: true, title: true, ownerId: true } },
        tenant: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    if (!lease) {
      return NextResponse.json(
        { error: 'Bail introuvable ou ne vous appartenant pas' },
        { status: 404 }
      )
    }

    // Validate toUserId is the other party in this lease
    if (effectiveRole === 'LOCATAIRE' && lease.ownerId !== toUserId) {
      return NextResponse.json(
        { error: 'L\'utilisateur évalué doit être le propriétaire du bail' },
        { status: 400 }
      )
    }
    if ((effectiveRole === 'PROPRIETAIRE' || effectiveRole === 'AGENCE') && lease.tenantId !== toUserId) {
      return NextResponse.json(
        { error: 'L\'utilisateur évalué doit être le locataire du bail' },
        { status: 400 }
      )
    }

    // Validate propertyId if provided
    if (propertyId && lease.propertyId !== propertyId) {
      return NextResponse.json(
        { error: 'La propriété ne correspond pas au bail' },
        { status: 400 }
      )
    }

    // Check if a review already exists for this lease by this user
    const existingReview = await db.rating.findFirst({
      where: { leaseId, fromUserId: userId },
    })
    if (existingReview) {
      return NextResponse.json(
        { error: 'Vous avez déjà laissé un avis pour ce bail' },
        { status: 400 }
      )
    }

    // Create the rating
    const rating = await db.rating.create({
      data: {
        score,
        comment: comment || null,
        propertyId: propertyId || null,
        leaseId,
        fromUserId: userId,
        toUserId,
      },
      include: {
        lease: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            property: { select: { id: true, title: true, city: true } },
          },
        },
        toUser: { select: { id: true, firstName: true, lastName: true } },
        property: { select: { id: true, title: true } },
      },
    })

    // Create notification for the rated user
    await db.notification.create({
      data: {
        userId: toUserId,
        type: 'DOSSIER_UPDATE',
        title: 'Nouvel avis reçu',
        message: `Vous avez reçu un avis de ${score}/5 pour le bail "${lease.property.title}".`,
        entityId: rating.id,
      },
    })

    return NextResponse.json({ data: rating }, { status: 201 })
  } catch (error) {
    console.error('Reviews POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
