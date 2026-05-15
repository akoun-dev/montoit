import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId est requis' }, { status: 400 })
    }

    // Get all leases for this property that are ACTIVE or EXPIRED (completed rentals)
    const leases = await db.lease.findMany({
      where: {
        propertyId,
        status: { in: ['ACTIVE', 'EXPIRED'] },
      },
      select: { id: true },
    })

    const leaseIds = leases.map((l) => l.id)

    if (leaseIds.length === 0) {
      return NextResponse.json({ reviews: [], avgRating: 0, totalReviews: 0 })
    }

    // Get ratings for these leases, with reviewer info
    const ratings = await db.rating.findMany({
      where: { leaseId: { in: leaseIds } },
      include: {
        fromUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const reviews = ratings.map((r) => ({
      id: r.id,
      name: `${r.fromUser.firstName} ${r.fromUser.lastName}`,
      avatar: `${r.fromUser.firstName.charAt(0)}${r.fromUser.lastName.charAt(0)}`,
      rating: r.score,
      date: r.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
      comment: r.comment || '',
      verified: true, // Reviews from completed leases are verified
    }))

    const totalReviews = reviews.length
    const avgRating = totalReviews > 0
      ? Number((ratings.reduce((sum, r) => sum + r.score, 0) / totalReviews).toFixed(1))
      : 0

    return NextResponse.json({ reviews, avgRating, totalReviews })
  } catch (error) {
    console.error('Reviews error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
