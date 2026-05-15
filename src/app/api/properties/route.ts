import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Parse query params
    const limitParam = searchParams.get('limit')
    const sort = searchParams.get('sort')
    const type = searchParams.get('type')
    const commune = searchParams.get('commune')
    const search = searchParams.get('search')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const minBedrooms = searchParams.get('minBedrooms')
    const furnished = searchParams.get('furnished')
    const all = searchParams.get('all')

    const limit = limitParam ? parseInt(limitParam) : 6

    // Build where clause
    const where: Record<string, unknown> = {
      status: 'ACTIVE',
    }

    if (type) {
      where.type = type
    }

    if (commune) {
      where.commune = { contains: commune }
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { address: { contains: search } },
        { commune: { contains: search } },
      ]
    }

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    if (minBedrooms) {
      where.bedrooms = { gte: parseInt(minBedrooms) }
    }

    if (furnished === 'true') {
      where.isFurnished = true
    } else if (furnished === 'false') {
      where.isFurnished = false
    }

    // Build order by
    let orderBy: Record<string, string> = { createdAt: 'desc' }
    if (sort === 'price-asc') orderBy = { price: 'asc' }
    else if (sort === 'price-desc') orderBy = { price: 'desc' }
    else if (sort === 'popular') orderBy = { viewsCount: 'desc' }
    // "recent" or default → createdAt desc

    // Execute query
    const properties = await db.property.findMany({
      where,
      include: {
        images: {
          where: { order: 0 },
          take: 1,
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy,
      ...(all === 'true' ? {} : { take: limit }),
    })

    // Transform: flatten first image into `image` field
    const result = properties.map(({ images, ...property }: { images: { url: string }[]; [key: string]: unknown }) => ({
      ...property,
      image: images.length > 0 ? images[0].url : null,
    }))

    return NextResponse.json({ properties: result })
  } catch (error) {
    console.error('Properties error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
