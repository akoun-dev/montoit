import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const [rentalFiles, visitRequests, activeLeases, conversations] = await Promise.all([
      db.rentalFile.findMany({
        where: { tenantId: userId },
        include: {
          documents: true,
          leases: { where: { status: 'ACTIVE' } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      db.visitRequest.findMany({
        where: { tenantId: userId },
        include: {
          property: {
            include: { images: { orderBy: { order: 'asc' }, take: 1 } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.lease.findMany({
        where: { tenantId: userId, status: 'ACTIVE' },
        include: {
          property: { include: { images: { orderBy: { order: 'asc' }, take: 1 } } },
          owner: { select: { firstName: true, lastName: true } },
        },
      }),
      db.conversation.findMany({
        where: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          participant1: { select: { id: true, firstName: true, lastName: true } },
          participant2: { select: { id: true, firstName: true, lastName: true } },
          property: { select: { title: true } },
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
    ])

    const unreadMessages = await db.message.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
      },
    })

    return NextResponse.json({
      rentalFiles,
      visitRequests,
      activeLeases,
      conversations,
      stats: {
        totalRentalFiles: rentalFiles.length,
        activeLeases: activeLeases.length,
        pendingVisits: visitRequests.filter((v) => v.status === 'PENDING').length,
        unreadMessages,
      },
    })
  } catch (error) {
    console.error('Locataire dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
