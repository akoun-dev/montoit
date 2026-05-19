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

    const { data: profile } = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = profile?.active_role || profile?.role
    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')
    const propertyFilter = searchParams.get('propertyId')

    const { data: rawOwnerProperties } = await supabase
      .from('properties')
      .select('id, title, city, address')
      .eq('owner_id', userId)

    const ownerProperties = (rawOwnerProperties || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      address: p.address,
    }))
    const ownerPropertyIds = ownerProperties.map(p => p.id)

    if (ownerPropertyIds.length === 0) {
      const resp = NextResponse.json({ data: [], stats: {}, properties: [] })
      return applyCookies(resp)
    }

    // Get rental_file_ids from leases
    const { data: allOwnerLeases } = await supabase
      .from('leases')
      .select('id, rental_file_id, property_id')
      .in('property_id', ownerPropertyIds)

    const leaseRentalFileIds = [...new Set((allOwnerLeases || []).map(l => l.rental_file_id).filter(Boolean))]

    // Also get rental_file_ids from applications (candidatures without lease yet)
    const { data: appsOnOwnerProperties } = await supabase
      .from('applications')
      .select('rental_file_id, property_id')
      .in('property_id', ownerPropertyIds)

    const appRentalFileIds = [...new Set((appsOnOwnerProperties || []).map((a: any) => a.rental_file_id).filter(Boolean))]

    const allRentalFileIds = [...new Set([...leaseRentalFileIds, ...appRentalFileIds])]

    if (allRentalFileIds.length === 0) {
      const resp = NextResponse.json({ data: [], stats: {}, properties: ownerProperties })
      return applyCookies(resp)
    }

    const { data: allRfForStats } = await supabase
      .from('rental_files')
      .select('id, status')
      .in('id', allRentalFileIds)

    const stats: Record<string, number> = {}
    for (const rf of (allRfForStats || [])) {
      stats[rf.status] = (stats[rf.status] || 0) + 1
    }

    let filteredRentalFileIds = allRentalFileIds
    if (propertyFilter) {
      const filteredLeases = (allOwnerLeases || []).filter(l => l.property_id === propertyFilter)
      const leaseIds = [...new Set(filteredLeases.map(l => l.rental_file_id).filter(Boolean))]
      const filteredApps = (appsOnOwnerProperties || []).filter((a: any) => a.property_id === propertyFilter)
      const appIds = [...new Set(filteredApps.map((a: any) => a.rental_file_id).filter(Boolean))]
      filteredRentalFileIds = [...new Set([...leaseIds, ...appIds])]
    }

    if (filteredRentalFileIds.length === 0) {
      const resp = NextResponse.json({ data: [], stats, properties: ownerProperties })
      return applyCookies(resp)
    }

    let rfQuery = supabase
      .from('rental_files')
      .select('*')
      .in('id', filteredRentalFileIds)
      .order('created_at', { ascending: false })

    if (statusFilter) {
      rfQuery = rfQuery.eq('status', statusFilter)
    }

    const { data: rawRentalFiles } = await rfQuery
    const rentalFilesData = rawRentalFiles || []

    const rfTenantIds = [...new Set(rentalFilesData.map(rf => rf.tenant_id).filter(Boolean))]
    const { data: rfTenants } = rfTenantIds.length > 0
      ? await supabase
          .from('users')
          .select('id, first_name, last_name, phone, email, avatar_url, gender, city, address, birth_date, created_at')
          .in('id', rfTenantIds)
      : { data: [] as any[] }

    const tenantDataMap: Record<string, any> = {}
    for (const t of (rfTenants || [])) {
      tenantDataMap[t.id] = {
        id: t.id,
        firstName: t.first_name,
        lastName: t.last_name,
        phone: t.phone,
        email: t.email,
        avatarUrl: t.avatar_url,
        gender: t.gender,
        city: t.city,
        address: t.address,
        birthDate: t.birth_date,
        createdAt: t.created_at,
      }
    }

    const { data: docs } = filteredRentalFileIds.length > 0
      ? await supabase
          .from('rental_file_documents')
          .select('id, rental_file_id, type, name, status, tc_comment, created_at')
          .in('rental_file_id', filteredRentalFileIds)
          .order('created_at', { ascending: false })
      : { data: [] as any[] }

    const docsByRentalFile: Record<string, any[]> = {}
    for (const d of (docs || [])) {
      if (!docsByRentalFile[d.rental_file_id]) docsByRentalFile[d.rental_file_id] = []
      docsByRentalFile[d.rental_file_id].push({
        id: d.id,
        type: d.type,
        name: d.name,
        status: d.status,
        tcComment: d.tc_comment,
        createdAt: d.created_at,
      })
    }

    const { data: rfLeases } = filteredRentalFileIds.length > 0
      ? await supabase
          .from('leases')
          .select('id, rental_file_id, property_id')
          .in('rental_file_id', filteredRentalFileIds)
      : { data: [] as any[] }

    const rfLeasePropertyIds = [...new Set((rfLeases || []).map(l => l.property_id).filter(Boolean))]
    const { data: rfLeaseProperties } = rfLeasePropertyIds.length > 0
      ? await supabase
          .from('properties')
          .select('id, title, city, address')
          .in('id', rfLeasePropertyIds)
      : { data: [] as any[] }

    const rfPropMap: Record<string, any> = {}
    for (const p of (rfLeaseProperties || [])) {
      rfPropMap[p.id] = { id: p.id, title: p.title, city: p.city, address: p.address }
    }

    const { data: propertyImages } = rfLeasePropertyIds.length > 0
      ? await supabase
          .from('property_images')
          .select('property_id, url, order')
          .in('property_id', rfLeasePropertyIds)
          .order('order', { ascending: true })
      : { data: [] as any[] }

    const imagesByProperty: Record<string, any[]> = {}
    for (const img of (propertyImages || [])) {
      if (!imagesByProperty[img.property_id]) imagesByProperty[img.property_id] = []
      imagesByProperty[img.property_id].push({ url: img.url, order: img.order })
    }

    const leasesByRentalFile: Record<string, any[]> = {}
    for (const l of (rfLeases || [])) {
      if (!leasesByRentalFile[l.rental_file_id]) leasesByRentalFile[l.rental_file_id] = []
      const prop = rfPropMap[l.property_id] || { id: l.property_id, title: '', city: '', address: '' }
      leasesByRentalFile[l.rental_file_id].push({
        id: l.id,
        rentalFileId: l.rental_file_id,
        property: {
          ...prop,
          images: imagesByProperty[l.property_id]?.slice(0, 1) || [],
        },
      })
    }

    const allTenantIds = [...new Set(rentalFilesData.map(rf => rf.tenant_id).filter(Boolean))]

    const { data: allActiveLeases } = allTenantIds.length > 0
      ? await supabase
          .from('leases')
          .select('id, tenant_id')
          .in('tenant_id', allTenantIds)
          .eq('status', 'ACTIVE')
      : { data: [] as any[] }

    const activeLeaseIds = [...new Set((allActiveLeases || []).map(l => l.id))]
    const { data: allLeasePayments } = activeLeaseIds.length > 0
      ? await supabase
          .from('payments')
          .select('lease_id, status')
          .in('lease_id', activeLeaseIds)
      : { data: [] as any[] }

    const paymentsByTenant: Record<string, any[]> = {}
    for (const l of (allActiveLeases || [])) {
      if (!paymentsByTenant[l.tenant_id]) paymentsByTenant[l.tenant_id] = []
      paymentsByTenant[l.tenant_id].push(
        ...(allLeasePayments || []).filter(p => p.lease_id === l.id)
      )
    }

    const paymentScores: Record<string, number | null> = {}
    for (const [tid, tenantPayments] of Object.entries(paymentsByTenant)) {
      if (tenantPayments.length > 0) {
        const paidCount = tenantPayments.filter(p => p.status === 'PAID').length
        paymentScores[tid] = Math.round((paidCount / tenantPayments.length) * 100)
      } else {
        paymentScores[tid] = null
      }
    }

    const { data: otherRentalFiles } = allTenantIds.length > 0
      ? await supabase
          .from('rental_files')
          .select('id, tenant_id, status, created_at, tenant_category')
          .in('tenant_id', allTenantIds)
          .order('created_at', { ascending: false })
      : { data: [] as any[] }

    const otherFileIds = [...new Set((otherRentalFiles || []).map(f => f.id))]
    const { data: otherLeases } = otherFileIds.length > 0
      ? await supabase
          .from('leases')
          .select('id, rental_file_id, property_id')
          .in('rental_file_id', otherFileIds)
      : { data: [] as any[] }

    const otherPropIds = [...new Set((otherLeases || []).map(l => l.property_id).filter(Boolean))]
    const { data: otherProps } = otherPropIds.length > 0
      ? await supabase
          .from('properties')
          .select('id, title, city')
          .in('id', otherPropIds)
      : { data: [] as any[] }

    const otherPropMap: Record<string, any> = {}
    for (const p of (otherProps || [])) {
      otherPropMap[p.id] = { title: p.title, city: p.city }
    }

    const otherLeasesByFile: Record<string, any[]> = {}
    for (const l of (otherLeases || [])) {
      if (!otherLeasesByFile[l.rental_file_id]) otherLeasesByFile[l.rental_file_id] = []
      otherLeasesByFile[l.rental_file_id].push({
        property: otherPropMap[l.property_id] || { title: '', city: '' },
      })
    }

    const otherFilesByTenant: Record<string, any[]> = {}
    for (const f of (otherRentalFiles || [])) {
      if (!otherFilesByTenant[f.tenant_id]) otherFilesByTenant[f.tenant_id] = []
      otherFilesByTenant[f.tenant_id].push({
        id: f.id,
        status: f.status,
        createdAt: f.created_at,
        tenantCategory: f.tenant_category,
        leases: otherLeasesByFile[f.id] || [],
      })
    }

    const enhancedFiles = rentalFilesData.map((rf: any) => {
      const tenantOtherFiles = (otherFilesByTenant[rf.tenant_id] || [])
        .filter(f => f.id !== rf.id)
        .slice(0, 5)

      return {
        id: rf.id,
        tenantId: rf.tenant_id,
        status: rf.status,
        tenantCategory: rf.tenant_category,
        createdAt: rf.created_at,
        updatedAt: rf.updated_at,
        tenant: tenantDataMap[rf.tenant_id] || {},
        documents: docsByRentalFile[rf.id] || [],
        leases: (leasesByRentalFile[rf.id] || []).map((l: any) => ({
          id: l.id,
          property: {
            id: l.property.id,
            title: l.property.title,
            city: l.property.city,
            address: l.property.address,
            images: l.property.images,
          },
        })),
        tenantPaymentScore: paymentScores[rf.tenant_id] ?? null,
        tenantOtherFiles,
      }
    })

    const resp = NextResponse.json({
      data: enhancedFiles,
      stats,
      properties: ownerProperties,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Owner rental files GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
