import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/owner/rental-files — List all rental files for the owner's properties
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
    const statusFilter = searchParams.get('status') // VALIDATED, REJECTED, SUBMITTED, TC_REVIEW, DRAFT, EXPIRED
    const propertyFilter = searchParams.get('propertyId')

    // Get all owner's properties
    const ownerProperties = await db.property.findMany({
      where: { ownerId: userId },
      select: { id: true, title: true, city: true, address: true },
    })
    const ownerPropertyIds = ownerProperties.map((p) => p.id)

    // Build where clause
    const where: Record<string, unknown> = {
      leases: {
        some: {
          propertyId: { in: ownerPropertyIds },
        },
      },
    }

    if (statusFilter) {
      where.status = statusFilter
    }

    if (propertyFilter) {
      where.leases = {
        some: {
          propertyId: propertyFilter,
        },
      }
    }

    // Fetch rental files for the owner's properties
    const rentalFiles = await db.rentalFile.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            avatarUrl: true,
            gender: true,
            city: true,
            address: true,
            birthDate: true,
            createdAt: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            name: true,
            status: true,
            tcComment: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        leases: {
          where: {
            propertyId: { in: ownerPropertyIds },
          },
          include: {
            property: {
              select: {
                id: true,
                title: true,
                city: true,
                address: true,
                images: { orderBy: { order: 'asc' }, take: 1 },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Status counts
    const statusCounts = await db.rentalFile.groupBy({
      by: ['status'],
      where: {
        leases: {
          some: {
            propertyId: { in: ownerPropertyIds },
          },
        },
      },
      _count: { status: true },
    })

    const stats = Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.status])
    )

    // Add payment score for tenants with active leases
    const enhancedFiles = await Promise.all(
      rentalFiles.map(async (rf) => {
        // Get tenant's active leases and payment info
        const tenantActiveLeases = await db.lease.findMany({
          where: {
            tenantId: rf.tenantId,
            status: 'ACTIVE',
          },
          include: {
            payments: {
              select: { status: true },
            },
          },
        })

        let paymentScore: number | null = null
        if (tenantActiveLeases.length > 0) {
          const allPayments = tenantActiveLeases.flatMap((l) => l.payments)
          if (allPayments.length > 0) {
            const paidOnTime = allPayments.filter(
              (p) => p.status === 'PAID'
            ).length
            paymentScore = Math.round((paidOnTime / allPayments.length) * 100)
          }
        }

        // Get other rental files for this tenant (history)
        const otherFiles = await db.rentalFile.findMany({
          where: {
            tenantId: rf.tenantId,
            id: { not: rf.id },
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
            tenantCategory: true,
            leases: {
              select: {
                property: { select: { title: true, city: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })

        return {
          ...rf,
          tenantPaymentScore: paymentScore,
          tenantOtherFiles: otherFiles,
        }
      })
    )

    return NextResponse.json({
      data: enhancedFiles,
      stats,
      properties: ownerProperties,
    })
  } catch (error) {
    console.error('Owner rental files GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
