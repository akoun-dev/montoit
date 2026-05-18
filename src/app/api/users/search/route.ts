import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/users/search — Search for users by name or email
// Query params: q=search_query
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''

    if (!q || q.length < 2) {
      return NextResponse.json({ users: [] })
    }

    // Add role filter based on current user's role
    let roleFilter: Record<string, unknown> = {}
    if (effectiveRole === 'LOCATAIRE') {
      roleFilter = { role: { in: ['PROPRIETAIRE', 'AGENCE'] } }
    } else if (effectiveRole === 'PROPRIETAIRE') {
      roleFilter = { role: { in: ['LOCATAIRE'] } }
    }
    // AGENCE and TC can see all roles

    const users = await db.user.findMany({
      where: {
        isActive: true,
        id: { not: userId }, // Don't include current user
        ...roleFilter,
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
      },
      take: 10,
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
