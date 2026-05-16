import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/rental-file — List rental files for current tenant with documents
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined

    const where: Record<string, unknown> = { tenantId: userId }
    if (status) {
      where.status = status
    }

    const rentalFiles = await db.rentalFile.findMany({
      where,
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        leases: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            monthlyRent: true,
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                city: true,
                images: {
                  orderBy: { order: 'asc' },
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Count by status for quick stats
    const statusCounts = await db.rentalFile.groupBy({
      by: ['status'],
      where: { tenantId: userId },
      _count: { status: true },
    })

    const stats = Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.status])
    )

    return NextResponse.json({
      data: rentalFiles,
      stats,
    })
  } catch (error) {
    console.error('Rental file GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/rental-file — Create or update a rental file (upsert draft)
export async function POST(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const {
      tenantCategory,
      monthlyIncome,
      employer,
      employmentType,
      guarantorName,
      guarantorPhone,
      guarantorRelation,
      submit,
    } = body as {
      tenantCategory?: string
      monthlyIncome?: number
      employer?: string
      employmentType?: string
      guarantorName?: string
      guarantorPhone?: string
      guarantorRelation?: string
      submit?: boolean
    }

    // Validate tenant category if provided
    const validTenantCategories = ['SALARIE', 'ENTREPRENEUR', 'ETUDIANT']
    const resolvedTenantCategory =
      tenantCategory && validTenantCategories.includes(tenantCategory)
        ? tenantCategory
        : undefined

    // Validate employment type if provided
    const validEmploymentTypes = ['CDI', 'CDD', 'FREELANCE', 'RETIRED', 'OTHER']
    const resolvedEmploymentType =
      employmentType && validEmploymentTypes.includes(employmentType)
        ? employmentType
        : undefined

    // Check if a DRAFT rental file exists
    const existingDraft = await db.rentalFile.findFirst({
      where: { tenantId: userId, status: 'DRAFT' },
    })

    let rentalFile

    if (existingDraft) {
      // Update existing draft
      rentalFile = await db.rentalFile.update({
        where: { id: existingDraft.id },
        data: {
          ...(resolvedTenantCategory && { tenantCategory: resolvedTenantCategory as 'SALARIE' | 'ENTREPRENEUR' | 'ETUDIANT' }),
          ...(monthlyIncome !== undefined && { monthlyIncome }),
          ...(employer !== undefined && { employer }),
          ...(resolvedEmploymentType && { employmentType: resolvedEmploymentType as 'CDI' | 'CDD' | 'FREELANCE' | 'RETIRED' | 'OTHER' }),
          ...(guarantorName !== undefined && { guarantorName }),
          ...(guarantorPhone !== undefined && { guarantorPhone }),
          ...(guarantorRelation !== undefined && { guarantorRelation }),
          ...(submit && { status: 'SUBMITTED' }),
        },
        include: {
          documents: { orderBy: { createdAt: 'desc' } },
          leases: {
            select: {
              id: true,
              status: true,
              property: {
                select: { id: true, title: true, address: true, city: true },
              },
            },
          },
        },
      })

      // Log to audit
      await db.auditLog.create({
        data: {
          action: submit ? 'SUBMIT' : 'UPDATE',
          entity: 'RentalFile',
          entityId: rentalFile.id,
          details: submit
            ? 'Dossier locatif soumis pour validation'
            : 'Dossier locatif (brouillon) mis à jour',
          userId,
        },
      })
    } else {
      // Create new draft (or submitted directly)
      const status = submit ? 'SUBMITTED' : 'DRAFT'

      rentalFile = await db.rentalFile.create({
        data: {
          tenantId: userId,
          status,
          ...(resolvedTenantCategory && { tenantCategory: resolvedTenantCategory as 'SALARIE' | 'ENTREPRENEUR' | 'ETUDIANT' }),
          ...(monthlyIncome !== undefined && { monthlyIncome }),
          ...(employer !== undefined && { employer }),
          ...(resolvedEmploymentType && { employmentType: resolvedEmploymentType as 'CDI' | 'CDD' | 'FREELANCE' | 'RETIRED' | 'OTHER' }),
          ...(guarantorName !== undefined && { guarantorName }),
          ...(guarantorPhone !== undefined && { guarantorPhone }),
          ...(guarantorRelation !== undefined && { guarantorRelation }),
        },
        include: {
          documents: { orderBy: { createdAt: 'desc' } },
          leases: {
            select: {
              id: true,
              status: true,
              property: {
                select: { id: true, title: true, address: true, city: true },
              },
            },
          },
        },
      })

      // Log to audit
      await db.auditLog.create({
        data: {
          action: submit ? 'SUBMIT' : 'CREATE',
          entity: 'RentalFile',
          entityId: rentalFile.id,
          details: submit
            ? 'Nouveau dossier locatif créé et soumis'
            : 'Nouveau dossier locatif (brouillon) créé',
          userId,
        },
      })
    }

    return NextResponse.json({ data: rentalFile })
  } catch (error) {
    console.error('Rental file POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
