import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/history — List audit logs for the current user
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const entity = searchParams.get('entity') || undefined
    const action = searchParams.get('action') || undefined

    // Admin can see all logs; other roles see only their own
    const where: Record<string, unknown> = effectiveRole === 'ADMIN' ? {} : { userId }
    if (entity) {
      where.entity = entity
    }
    if (action) {
      where.action = action
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          details: true,
          createdAt: true,
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      db.auditLog.count({ where }),
    ])

    return NextResponse.json({
      logs: logs,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('History GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
