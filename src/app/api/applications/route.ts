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

    const supabase = getSupabaseAdminClient()

    const profileResult = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()
    const profile = profileResult.data as { role: string; active_role: string } | null
    const effectiveRole = profile?.active_role || profile?.role

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    let query = supabase.from('applications').select('*', { count: 'exact' }).eq('tenant_id', userId)
    if (status) {
      query = query.eq('status', status)
    }
    query = query.order('updated_at', { ascending: false }).range((page - 1) * limit, page * limit - 1)

    const queryResult = await query
    const applications = queryResult.data as any[]
    const total = queryResult.count

    const appIds = (applications ?? []).map((a: any) => a.id)

    let documentsMap: Record<string, any[]> = {}
    let leasesMap: Record<string, any[]> = {}
    let reviewedByMap: Record<string, any> = {}

    if (appIds.length > 0) {
      const [docResult, leaseResult] = await Promise.all([
        supabase.from('rental_file_documents').select('*').in('rental_file_id', appIds).order('created_at', { ascending: false }),
        supabase.from('leases').select('*, property:properties!property_id(*)').in('rental_file_id', appIds),
      ])

      const docsData = (docResult.data ?? []) as any[]
      for (const doc of docsData) {
        if (!documentsMap[doc.rental_file_id]) documentsMap[doc.rental_file_id] = []
        documentsMap[doc.rental_file_id].push(doc)
      }

      const leasesData = (leaseResult.data ?? []) as any[]
      for (const lease of leasesData) {
        if (!leasesMap[lease.rental_file_id]) leasesMap[lease.rental_file_id] = []
        leasesMap[lease.rental_file_id].push(lease)
      }

      const propertyIds = [...new Set(leasesData.map((l: any) => l.property_id).filter(Boolean))]
      if (propertyIds.length > 0) {
        const propertyImagesResult = await supabase
          .from('property_images')
          .select('id, url, property_id')
          .in('property_id', propertyIds)
          .order('order', { ascending: true })
        const propertyImages = propertyImagesResult.data as any[]

        const propImageMap: Record<string, any[]> = {}
        for (const img of propertyImages ?? []) {
          if (!propImageMap[img.property_id]) propImageMap[img.property_id] = []
          propImageMap[img.property_id].push(img)
        }

        for (const lease of leasesData) {
          if (lease.property && propImageMap[lease.property_id]) {
            lease.property.images = propImageMap[lease.property_id].slice(0, 1).map((i: any) => ({ url: i.url }))
          }
        }
      }

      const ownerIds = [...new Set(leasesData.map((l: any) => l.owner_id).filter(Boolean))]
      if (ownerIds.length > 0) {
        const ownersResult = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', ownerIds)
        const owners = ownersResult.data as any[]
        const ownerMap: Record<string, any> = {}
        for (const o of owners ?? []) {
          ownerMap[o.id] = o
        }
        for (const lease of leasesData) {
          if (lease.property && ownerMap[lease.owner_id]) {
            lease.property.owner = {
              id: ownerMap[lease.owner_id].id,
              firstName: ownerMap[lease.owner_id].first_name,
              lastName: ownerMap[lease.owner_id].last_name,
            }
          }
        }
      }

      const reviewedByIds = [...new Set((applications ?? []).map((a: any) => a.reviewed_by_id).filter(Boolean))]
      if (reviewedByIds.length > 0) {
        const reviewersResult = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', reviewedByIds)
        const reviewers = reviewersResult.data as any[]
        for (const r of reviewers ?? []) {
          reviewedByMap[r.id] = { id: r.id, firstName: r.first_name, lastName: r.last_name }
        }
      }
    }

    const enrichedApplications = (applications ?? []).map((app: any) => {
      const statusTimeline = getStatusTimeline(app.status)
      const linkedProperty = (leasesMap[app.id]?.[0]?.property) ? {
        id: leasesMap[app.id][0].property.id,
        title: leasesMap[app.id][0].property.title,
        address: leasesMap[app.id][0].property.address,
        city: leasesMap[app.id][0].property.city,
        type: leasesMap[app.id][0].property.type,
        price: leasesMap[app.id][0].property.price,
        currency: leasesMap[app.id][0].property.currency,
        images: leasesMap[app.id][0].property.images || [],
        owner: leasesMap[app.id][0].property.owner || null,
      } : null

      const docs = documentsMap[app.id] || []
      const totalDocs = docs.length
      const validatedDocs = docs.filter((d: any) => d.status === 'VALIDATED').length
      const rejectedDocs = docs.filter((d: any) => d.status === 'REJECTED').length

      return {
        id: app.id,
        status: app.status,
        monthlyIncome: app.monthly_income,
        employer: app.employer,
        employmentType: app.employment_type,
        guarantorName: app.guarantor_name,
        guarantorPhone: app.guarantor_phone,
        guarantorRelation: app.guarantor_relation,
        rejectionReason: app.rejection_reason,
        tcComment: app.tc_comment,
        reviewedAt: app.reviewed_at,
        validUntil: app.valid_until,
        createdAt: app.created_at,
        updatedAt: app.updated_at,
        statusTimeline,
        linkedProperty,
        documentProgress: {
          total: totalDocs,
          validated: validatedDocs,
          rejected: rejectedDocs,
          pending: totalDocs - validatedDocs - rejectedDocs,
        },
        reviewedBy: reviewedByMap[app.reviewed_by_id] || null,
        documents: docs.map((d: any) => ({
          id: d.id,
          type: d.type,
          name: d.name,
          status: d.status,
          createdAt: d.created_at,
        })),
        leases: (leasesMap[app.id] || []).map((l: any) => ({
          id: l.id,
          status: l.status,
          startDate: l.start_date,
          endDate: l.end_date,
          monthlyRent: l.monthly_rent,
          property: l.property ? {
            id: l.property.id,
            title: l.property.title,
            address: l.property.address,
            city: l.property.city,
            type: l.property.type,
            price: l.property.price,
            currency: l.property.currency,
            images: (l.property.images || []).slice(0, 1),
            owner: l.property.owner || null,
          } : null,
        })),
      }
    })

    const allStatusesResult = await supabase
      .from('applications')
      .select('status')
      .eq('tenant_id', userId)
    const allStatuses = allStatusesResult.data as any[]

    const stats: Record<string, number> = {}
    for (const a of allStatuses ?? []) {
      stats[a.status] = (stats[a.status] || 0) + 1
    }

    const resp = NextResponse.json({
      data: enrichedApplications,
      pagination: {
        page,
        limit,
        total: total ?? 0,
        totalPages: Math.ceil((total ?? 0) / limit),
      },
      stats,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Applications GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function getStatusTimeline(currentStatus: string) {
  const steps = [
    { status: 'DRAFT', label: 'Brouillon' },
    { status: 'SUBMITTED', label: 'Soumis' },
    { status: 'TC_REVIEW', label: 'Examen TC' },
    { status: 'VALIDATED', label: 'Validé' },
  ]

  const statusOrder = ['DRAFT', 'SUBMITTED', 'TC_REVIEW', 'VALIDATED']
  const currentIndex = statusOrder.indexOf(currentStatus)
  const isRejected = currentStatus === 'REJECTED'
  const isExpired = currentStatus === 'EXPIRED'

  return steps.map((step, index) => ({
    ...step,
    completed: !isRejected && !isExpired && index < currentIndex,
    active: !isRejected && !isExpired && index === currentIndex,
  })).concat(
    isRejected
      ? [{ status: 'REJECTED', label: 'Rejeté', completed: false, active: true }]
      : isExpired
        ? [{ status: 'EXPIRED', label: 'Expiré', completed: false, active: true }]
        : []
  )
}
