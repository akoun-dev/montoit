import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const city = searchParams.get('city')
    const type = searchParams.get('type')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 12

    const where: Record<string, unknown> = {
      status: 'ACTIVE',
    }

    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (type) where.type = type
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) (where.price as Record<string, number>).gte = parseFloat(minPrice)
      if (maxPrice) (where.price as Record<string, number>).lte = parseFloat(maxPrice)
    }

    const [properties, total] = await Promise.all([
      db.property.findMany({
        where,
        include: {
          images: { orderBy: { order: 'asc' } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.property.count({ where }),
    ])

    return NextResponse.json({
      properties,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Properties error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
