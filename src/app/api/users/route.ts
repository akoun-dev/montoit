import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/users — Search/list users with optional role filter
// Query params: role=AGENCE, q=search_query
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')
    const q = searchParams.get('q') || ''

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
      id: { not: userId },
    }

    // Role filter
    if (role) {
      where.OR = [
        { role },
        { activeRole: role },
      ]
    }

    // Search filter
    if (q && q.length >= 2) {
      const searchFilter = {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ],
      }

      // Combine with role filter if both exist
      if (role) {
        where.AND = [searchFilter]
      } else {
        Object.assign(where, searchFilter)
      }
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        role: true,
        activeRole: true,
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Users list error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
