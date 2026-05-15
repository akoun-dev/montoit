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

    // satisfactionRate: fixed at 98 (no real review data yet)
    const satisfactionRate = 98

    return NextResponse.json({
      totalProperties,
      monthlyVisitors,
      newToday,
      satisfactionRate,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
