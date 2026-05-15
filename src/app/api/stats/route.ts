import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // totalProperties: count of ACTIVE properties
    const totalProperties = await db.property.count({
      where: { status: 'ACTIVE' },
    })

    // monthlyVisitors: sum of viewsCount across all active properties
    const viewsAggregate = await db.property.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { viewsCount: true },
    })
    const monthlyVisitors = viewsAggregate._sum.viewsCount ?? 0

    // newToday: count of properties created today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const newToday = await db.property.count({
      where: {
        status: 'ACTIVE',
        createdAt: { gte: todayStart },
      },
    })

    // satisfactionRate: computed from Rating table (average of all scores, as percentage)
    const ratingsAggregate = await db.rating.aggregate({
      _avg: { score: true },
      _count: { score: true },
    })
    // If we have ratings, convert 1-5 scale to percentage; otherwise show 0
    const satisfactionRate = ratingsAggregate._count.score > 0
      ? Math.round((ratingsAggregate._avg.score! / 5) * 100)
      : 0

    // communes & types: distinct values from DB for filter dropdowns
    const communesRaw = await db.property.findMany({
      where: { status: 'ACTIVE', commune: { not: null } },
      select: { commune: true },
      distinct: ['commune'],
      orderBy: { commune: 'asc' },
    })
    const communes = communesRaw.map((r) => r.commune!).filter(Boolean)

    const typesRaw = await db.property.findMany({
      where: { status: 'ACTIVE' },
      select: { type: true },
      distinct: ['type'],
      orderBy: { type: 'asc' },
    })
    const propertyTypes = typesRaw.map((r) => r.type)

    return NextResponse.json({
      totalProperties,
      monthlyVisitors,
      newToday,
      satisfactionRate,
      communes,
      propertyTypes,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
