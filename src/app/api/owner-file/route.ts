import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/owner-file — List owner files for current owner with documents
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined

    const where: Record<string, unknown> = { ownerId: userId }
    if (status) {
      where.status = status
    }

    const ownerFiles = await db.ownerFile.findMany({
      where,
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Count by status for quick stats
    const statusCounts = await db.ownerFile.groupBy({
      by: ['status'],
      where: { ownerId: userId },
      _count: { status: true },
    })

    const stats = Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.status])
    )

    return NextResponse.json({
      data: ownerFiles,
      stats,
    })
  } catch (error) {
    console.error('Owner file GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/owner-file — Create or update an owner file (upsert draft)
export async function POST(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { submit } = body as {
      submit?: boolean
    }

    // Check if a DRAFT owner file exists
    const existingDraft = await db.ownerFile.findFirst({
      where: { ownerId: userId, status: 'DRAFT' },
    })

    let ownerFile

    if (existingDraft) {
      // Update existing draft
      ownerFile = await db.ownerFile.update({
        where: { id: existingDraft.id },
        data: {
          ...(submit && { status: 'SUBMITTED' }),
        },
        include: {
          documents: { orderBy: { createdAt: 'desc' } },
        },
      })

      // Log to audit
      await db.auditLog.create({
        data: {
          action: submit ? 'SUBMIT' : 'UPDATE',
          entity: 'OwnerFile',
          entityId: ownerFile.id,
          details: submit
            ? 'Dossier propriétaire soumis pour validation'
            : 'Dossier propriétaire (brouillon) mis à jour',
          userId,
        },
      })
    } else {
      // Create new draft (or submitted directly)
      const status = submit ? 'SUBMITTED' : 'DRAFT'

      ownerFile = await db.ownerFile.create({
        data: {
          ownerId: userId,
          status,
        },
        include: {
          documents: { orderBy: { createdAt: 'desc' } },
        },
      })

      // Log to audit
      await db.auditLog.create({
        data: {
          action: submit ? 'SUBMIT' : 'CREATE',
          entity: 'OwnerFile',
          entityId: ownerFile.id,
          details: submit
            ? 'Nouveau dossier propriétaire créé et soumis'
            : 'Nouveau dossier propriétaire (brouillon) créé',
          userId,
        },
      })
    }

    return NextResponse.json({ data: ownerFile })
  } catch (error) {
    console.error('Owner file POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
