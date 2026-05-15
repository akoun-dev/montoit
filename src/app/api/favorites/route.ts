import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/favorites — list the current user's favorite properties
export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get('montoit-user-id')?.value
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const favorites = await db.favorite.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            images: { orderBy: { order: 'asc' }, take: 1 },
            owner: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('Favorites GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/favorites — toggle a favorite (add if not exists, remove if exists)
export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get('montoit-user-id')?.value
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { propertyId } = await req.json()
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId requis' }, { status: 400 })
    }

    // Check property exists
    const property = await db.property.findUnique({ where: { id: propertyId } })
    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    // Check if already favorited
    const existing = await db.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    })

    if (existing) {
      // Remove from favorites
      await db.favorite.delete({ where: { id: existing.id } })
      return NextResponse.json({ isFavorite: false, action: 'removed' })
    } else {
      // Add to favorites
      await db.favorite.create({
        data: { userId, propertyId },
      })
      return NextResponse.json({ isFavorite: true, action: 'added' })
    }
  } catch (error) {
    console.error('Favorites POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
