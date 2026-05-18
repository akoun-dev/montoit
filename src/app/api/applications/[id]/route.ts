import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const applicationResult = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', userId)
      .maybeSingle()
    const application = applicationResult.data as any

    if (!application) {
      return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 })
    }

    const [docResult, leaseResult, reviewerResult] = await Promise.all([
      supabase.from('rental_file_documents').select('*').eq('rental_file_id', id).order('created_at', { ascending: false }),
      supabase.from('leases').select('*, property:properties!property_id(*)').eq('rental_file_id', id),
      application.reviewed_by_id
        ? supabase.from('users').select('id, first_name, last_name').eq('id', application.reviewed_by_id).single()
        : Promise.resolve({ data: null, error: null }),
    ])

    const documents = (docResult.data ?? []) as any[]
    const leases = (leaseResult.data ?? []) as any[]

    const propertyIds = [...new Set(leases.map((l: any) => l.property_id).filter(Boolean))]
    if (propertyIds.length > 0) {
      const propertyImagesResult = await supabase
        .from('property_images')
        .select('url, property_id')
        .in('property_id', propertyIds)
        .order('order', { ascending: true })
      const propertyImages = propertyImagesResult.data as any[]

      const propImageMap: Record<string, any[]> = {}
      for (const img of propertyImages ?? []) {
        if (!propImageMap[img.property_id]) propImageMap[img.property_id] = []
        propImageMap[img.property_id].push(img)
      }

      const ownerIds = [...new Set(leases.map((l: any) => l.owner_id).filter(Boolean))]
      let ownerMap: Record<string, any> = {}
      if (ownerIds.length > 0) {
        const ownersResult = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', ownerIds)
        const owners = ownersResult.data as any[]
        for (const o of owners ?? []) {
          ownerMap[o.id] = { id: o.id, firstName: o.first_name, lastName: o.last_name }
        }
      }

      for (const lease of leases) {
        if (lease.property && propImageMap[lease.property_id]) {
          lease.property.images = propImageMap[lease.property_id].slice(0, 1).map((i: any) => ({ url: i.url }))
        }
        if (lease.property && ownerMap[lease.owner_id]) {
          lease.property.owner = ownerMap[lease.owner_id]
        }
      }
    }

    const steps = [
      { status: 'DRAFT', label: 'Brouillon' },
      { status: 'SUBMITTED', label: 'Soumis' },
      { status: 'TC_REVIEW', label: 'Examen TC' },
      { status: 'VALIDATED', label: 'Validé' },
    ]

    const statusOrder = ['DRAFT', 'SUBMITTED', 'TC_REVIEW', 'VALIDATED']
    const currentIndex = statusOrder.indexOf(application.status)
    const isRejected = application.status === 'REJECTED'
    const isExpired = application.status === 'EXPIRED'

    const statusTimeline = steps.map((step, index) => ({
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

    const linkedProperty = leases.length > 0 && leases[0].property ? {
      id: leases[0].property.id,
      title: leases[0].property.title,
      address: leases[0].property.address,
      city: leases[0].property.city,
      type: leases[0].property.type,
      price: leases[0].property.price,
      currency: leases[0].property.currency,
      images: leases[0].property.images || [],
      owner: leases[0].property.owner || null,
    } : null

    const totalDocs = documents.length
    const validatedDocs = documents.filter((d: any) => d.status === 'VALIDATED').length
    const rejectedDocs = documents.filter((d: any) => d.status === 'REJECTED').length

    const reviewedBy = reviewerResult.data ? {
      id: reviewerResult.data.id,
      firstName: reviewerResult.data.first_name,
      lastName: reviewerResult.data.last_name,
    } : null

    const resp = NextResponse.json({
      data: {
        id: application.id,
        status: application.status,
        monthlyIncome: application.monthly_income,
        employer: application.employer,
        employmentType: application.employment_type,
        guarantorName: application.guarantor_name,
        guarantorPhone: application.guarantor_phone,
        guarantorRelation: application.guarantor_relation,
        rejectionReason: application.rejection_reason,
        tcComment: application.tc_comment,
        reviewedAt: application.reviewed_at,
        validUntil: application.valid_until,
        createdAt: application.created_at,
        updatedAt: application.updated_at,
        statusTimeline,
        linkedProperty,
        documentProgress: {
          total: totalDocs,
          validated: validatedDocs,
          rejected: rejectedDocs,
          pending: totalDocs - validatedDocs - rejectedDocs,
        },
        reviewedBy,
        documents: documents.map((d: any) => ({
          id: d.id,
          type: d.type,
          name: d.name,
          status: d.status,
          tcComment: d.tc_comment,
          createdAt: d.created_at,
        })),
        leases: leases.map((l: any) => ({
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
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Application detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
