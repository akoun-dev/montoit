import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/favorites/check — check if a list of property IDs are favorited
// Body: { propertyIds: string[] }
export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get('montoit-user-id')?.value
    if (!userId) {
      return NextResponse.json({ favorites: {} }, { status: 200 })
    }

    const { propertyIds } = await req.json()
    if (!Array.isArray(propertyIds)) {
      return NextResponse.json({ error: 'propertyIds requis (tableau)' }, { status: 400 })
    }

    if (propertyIds.length === 0) {
      return NextResponse.json({ favorites: {} })
    }

    const favorites = await db.favorite.findMany({
      where: {
        userId,
        propertyId: { in: propertyIds },
      },
      select: { propertyId: true },
    })

    const favoriteMap: Record<string, boolean> = {}
    for (const f of favorites) {
      favoriteMap[f.propertyId] = true
    }

    return NextResponse.json({ favorites: favoriteMap })
  } catch (error) {
    console.error('Favorites check error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
