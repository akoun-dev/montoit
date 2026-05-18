import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const admin = getSupabaseAdminClient()

    const { data: profile } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = profile?.active_role || profile?.role
    if (effectiveRole !== 'TIERS_CONFIANCE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const [
      { data: pendingRentalFilesData },
      { data: pendingOwnershipDocsData },
      { data: slasData },
      { data: recentActivitiesData },
      { data: overdueSlasListData },
      pendingPropertiesCount,
      pendingAgencyDocsCount,
      pendingOwnerDocsCount,
      submittedRentalCount,
      tcReviewRentalCount,
    ] = await Promise.all([
      admin.from('rental_files').select('*').in('status', ['SUBMITTED', 'TC_REVIEW']).order('created_at', { ascending: true }),
      admin.from('ownership_documents').select('*').eq('status', 'PENDING').order('created_at', { ascending: true }),
      admin.from('validation_slas').select('*').eq('reviewer_id', userId).order('deadline_at', { ascending: true }).limit(50),
      admin.from('audit_logs').select('entity, action, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      admin.from('validation_slas').select('*').eq('reviewer_id', userId).eq('is_overdue', true).is('completed_at', null).order('deadline_at', { ascending: true }).limit(20),
      admin.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_VERIFICATION').then(({ count }) => count ?? 0),
      admin.from('ownership_documents').select('id', { count: 'exact', head: true }).eq('status', 'PENDING').in('type', ['AGREMENT', 'RCCM']).then(({ count }) => count ?? 0),
      admin.from('ownership_documents').select('id', { count: 'exact', head: true }).eq('status', 'PENDING').in('type', ['TITRE_FONCIER', 'ACTE_NOTARIE', 'ATTESTATION_PROPRIETE']).then(({ count }) => count ?? 0),
      admin.from('rental_files').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED').then(({ count }) => count ?? 0),
      admin.from('rental_files').select('id', { count: 'exact', head: true }).eq('status', 'TC_REVIEW').then(({ count }) => count ?? 0),
    ])

    const pendingRentalFiles = (pendingRentalFilesData ?? []) as any[]
    const pendingOwnershipDocs = (pendingOwnershipDocsData ?? []) as any[]
    const slas = (slasData ?? []) as any[]
    const recentActivities = (recentActivitiesData ?? []) as any[]
    const overdueSlasList = (overdueSlasListData ?? []) as any[]

    // Fetch tenant info for rental files
    const rfTenantIds = [...new Set(pendingRentalFiles.map(f => f.tenant_id).filter((id): id is string => !!id))]
    const { data: rfTenants } = rfTenantIds.length > 0
      ? await admin.from('users').select('id, first_name, last_name, phone').in('id', rfTenantIds)
      : { data: [] as any[] }

    // Fetch documents for rental files
    const rfIds = pendingRentalFiles.map(f => f.id)
    const { data: rfDocuments } = rfIds.length > 0
      ? await admin.from('rental_file_documents').select('*').in('rental_file_id', rfIds)
      : { data: [] as any[] }

    // Fetch owner info for ownership docs
    const odOwnerIds = [...new Set(pendingOwnershipDocs.map(d => d.owner_id).filter((id): id is string => !!id))]
    const { data: odOwners } = odOwnerIds.length > 0
      ? await admin.from('users').select('id, first_name, last_name, phone').in('id', odOwnerIds)
      : { data: [] as any[] }

    // Fetch reviewer info for overdue SLAs
    const slaReviewerIds = [...new Set(overdueSlasList.map(s => s.reviewer_id).filter((id): id is string => !!id))]
    const { data: slaReviewers } = slaReviewerIds.length > 0
      ? await admin.from('users').select('id, first_name, last_name').in('id', slaReviewerIds)
      : { data: [] as any[] }

    // Audit breakdown
    const { data: auditRowsData } = await admin
      .from('audit_logs')
      .select('action')
      .eq('user_id', userId)
      .in('action', ['RENTAL_FILE_APPROVED', 'RENTAL_FILE_REJECTED', 'RENTAL_FILE_INFO_REQUESTED', 'RENTAL_FILE_PRIORITY_CHANGED'])
    const auditRows = (auditRowsData ?? []) as any[]

    // Total reviewed count (rental files where reviewed_by_id = userId and status in VALIDATED/REJECTED)
    const { count: totalReviewed } = await admin
      .from('rental_files')
      .select('id', { count: 'exact', head: true })
      .eq('reviewed_by_id', userId)
      .in('status', ['VALIDATED', 'REJECTED'])

    // Ownership doc breakdown by type (group in JS)
    const ownershipDocTypeCounts: Record<string, number> = {}
    for (const d of pendingOwnershipDocs ?? []) {
      ownershipDocTypeCounts[d.type] = (ownershipDocTypeCounts[d.type] || 0) + 1
    }

    // Audit breakdown (group in JS)
    const auditMap: Record<string, number> = {}
    for (const a of auditRows ?? []) {
      auditMap[a.action] = (auditMap[a.action] || 0) + 1
    }

    // Build maps
    const tenantMap = new Map((rfTenants ?? []).map(t => [t.id, t]))
    const ownerMap = new Map((odOwners ?? []).map(o => [o.id, o]))
    const docByRentalFile = groupBy(rfDocuments ?? [], 'rental_file_id')
    const reviewerMap = new Map((slaReviewers ?? []).map(r => [r.id, r]))

    // Overdue SLAs within slas
    const overdueSlas = slas.filter(s => s.is_overdue && !s.completed_at)

    // Map results
    const mappedPendingRentalFiles = (pendingRentalFiles ?? []).map(rf => {
      const tenant = tenantMap.get(rf.tenant_id)
      const documents = docByRentalFile.get(rf.id) ?? []
      return {
        id: rf.id,
        tenantId: rf.tenant_id,
        status: rf.status,
        tenantCategory: rf.tenant_category,
        reviewedById: rf.reviewed_by_id,
        createdAt: rf.created_at,
        updatedAt: rf.updated_at,
        tenant: tenant ? {
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          phone: tenant.phone,
        } : null,
        documents: documents.map(d => ({
          id: d.id,
          rentalFileId: d.rental_file_id,
          type: d.type,
          url: d.url,
          name: d.name,
          createdAt: d.created_at,
        })),
      }
    })

    const mappedPendingOwnershipDocs = (pendingOwnershipDocs ?? []).map(d => {
      const owner = ownerMap.get(d.owner_id)
      return {
        id: d.id,
        ownerId: d.owner_id,
        type: d.type,
        status: d.status,
        createdAt: d.created_at,
        owner: owner ? {
          firstName: owner.first_name,
          lastName: owner.last_name,
          phone: owner.phone,
        } : null,
      }
    })

    const mappedSlas = (slas ?? []).map(s => ({
      id: s.id,
      reviewerId: s.reviewer_id,
      entityType: s.entity_type,
      entityId: s.entity_id,
      submittedAt: s.submitted_at,
      deadlineAt: s.deadline_at,
      completedAt: s.completed_at,
      isOverdue: s.is_overdue,
      createdAt: s.created_at,
    }))

    const mappedRecentActivities = (recentActivities ?? []).map(a => ({
      entity: a.entity,
      action: a.action,
      createdAt: a.created_at,
    }))

    const now = new Date()
    const mappedOverdueSlasList = (overdueSlasList ?? []).map(sla => {
      const deadline = new Date(sla.deadline_at)
      const diffMs = now.getTime() - deadline.getTime()
      const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      return {
        id: sla.id,
        entityType: sla.entity_type,
        entityId: sla.entity_id,
        submittedAt: sla.submitted_at,
        deadlineAt: sla.deadline_at,
        daysOverdue,
      }
    })

    const validatedCount = auditMap['RENTAL_FILE_APPROVED'] || 0
    const rejectedCount = auditMap['RENTAL_FILE_REJECTED'] || 0
    const infoRequestedCount = auditMap['RENTAL_FILE_INFO_REQUESTED'] || 0

    const resp = NextResponse.json({
      pendingRentalFiles: mappedPendingRentalFiles,
      pendingOwnershipDocs: mappedPendingOwnershipDocs,
      slas: mappedSlas,
      stats: {
        pendingRentalFiles: mappedPendingRentalFiles.length,
        pendingOwnershipDocs: mappedPendingOwnershipDocs.length,
        pendingProperties: pendingPropertiesCount,
        totalReviewed: totalReviewed ?? 0,
        overdueSlas: overdueSlas.length,
        slaCompliance: (totalReviewed ?? 0) > 0 ? Math.round((((totalReviewed ?? 0) - overdueSlas.length) / (totalReviewed ?? 0)) * 100) : 100,
        pendingAgencyDocs: pendingAgencyDocsCount,
        pendingOwnerDocs: pendingOwnerDocsCount,
        rentalFilesByStatus: {
          SUBMITTED: submittedRentalCount,
          TC_REVIEW: tcReviewRentalCount,
        },
        pendingOwnerDocsByType: {
          TITRE_FONCIER: ownershipDocTypeCounts['TITRE_FONCIER'] || 0,
          ACTE_NOTARIE: ownershipDocTypeCounts['ACTE_NOTARIE'] || 0,
          ATTESTATION_PROPRIETE: ownershipDocTypeCounts['ATTESTATION_PROPRIETE'] || 0,
        },
        pendingAgencyDocsByType: {
          AGREMENT: ownershipDocTypeCounts['AGREMENT'] || 0,
          RCCM: ownershipDocTypeCounts['RCCM'] || 0,
        },
        auditBreakdown: {
          validated: validatedCount,
          rejected: rejectedCount,
          infoRequested: infoRequestedCount,
        },
      },
      recentActivities: mappedRecentActivities,
      overdueSlasList: mappedOverdueSlasList,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function groupBy(arr: any[], key: string) {
  const map = new Map<string, any[]>()
  for (const item of arr) {
    const k = item[key]
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return map
}
