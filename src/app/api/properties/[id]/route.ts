import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const property = await db.property.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Propriété non trouvée' }, { status: 404 })
    }

    // Increment viewsCount (fire-and-forget, non-blocking)
    db.property.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    }).catch((err) => {
      console.error('Failed to increment viewsCount:', err)
    })

    return NextResponse.json({ property })
  } catch (error) {
    console.error('Property detail error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
