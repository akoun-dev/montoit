import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// GET /api/maintenance/[id]/comments — Get comments for a maintenance request
// Both LOCATAIRE and PROPRIETAIRE/AGENCE can view comments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    const { id } = await params

    // Verify the maintenance request exists and the user has access
    let where: Record<string, unknown> = { id }
    if (effectiveRole === 'LOCATAIRE') {
      where = { id, tenantId: userId }
    } else if (effectiveRole === 'PROPRIETAIRE' || effectiveRole === 'AGENCE') {
      where = { id, lease: { ownerId: userId } }
    } else {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const maintenanceRequest = await db.maintenanceRequest.findFirst({ where })

    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: 'Demande introuvable ou accès refusé' },
        { status: 404 }
      )
    }

    // Pagination
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const [comments, total] = await Promise.all([
      db.maintenanceComment.findMany({
        where: { maintenanceRequestId: id },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.maintenanceComment.count({
        where: { maintenanceRequestId: id },
      }),
    ])

    return NextResponse.json({
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Maintenance comments GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/maintenance/[id]/comments — Add a comment to a maintenance request
// Both LOCATAIRE and PROPRIETAIRE/AGENCE can add comments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    const { id } = await params
    const body = await req.json()
    const { content } = body as { content?: string }

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le contenu du commentaire est requis' },
        { status: 400 }
      )
    }

    if (content.trim().length > 2000) {
      return NextResponse.json(
        { error: 'Le commentaire ne peut pas dépasser 2000 caractères' },
        { status: 400 }
      )
    }

    // Verify the maintenance request exists and the user has access
    let where: Record<string, unknown> = { id }
    if (effectiveRole === 'LOCATAIRE') {
      where = { id, tenantId: userId }
    } else if (effectiveRole === 'PROPRIETAIRE' || effectiveRole === 'AGENCE') {
      where = { id, lease: { ownerId: userId } }
    } else {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const maintenanceRequest = await db.maintenanceRequest.findFirst({ where })

    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: 'Demande introuvable ou accès refusé' },
        { status: 404 }
      )
    }

    // Don't allow comments on CLOSED requests
    if (maintenanceRequest.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Impossible d\'ajouter un commentaire sur une demande fermée' },
        { status: 400 }
      )
    }

    // Create the comment
    const newComment = await db.maintenanceComment.create({
      data: {
        content: content.trim(),
        maintenanceRequestId: id,
        authorId: userId,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'COMMENT',
        entity: 'MaintenanceRequest',
        entityId: id,
        details: `Commentaire ajouté par ${effectiveRole} sur la demande: ${maintenanceRequest.title}`,
        userId,
      },
    })

    // Notify the other party
    const notifyUserId =
      effectiveRole === 'LOCATAIRE'
        ? (await db.maintenanceRequest.findUnique({ where: { id }, select: { lease: { select: { ownerId: true } } } }))?.lease.ownerId
        : maintenanceRequest.tenantId

    if (notifyUserId) {
      await notify({
        userId: notifyUserId,
        type: 'MAINTENANCE',
        title: 'Nouveau commentaire sur la demande de maintenance',
        message: `Un nouveau commentaire a été ajouté sur "${maintenanceRequest.title}".`,
        actionUrl: 'maintenance',
        entityId: id,
      })
    }

    return NextResponse.json({ data: newComment }, { status: 201 })
  } catch (error) {
    console.error('Maintenance comments POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
