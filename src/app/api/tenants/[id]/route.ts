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

    const { data: profile } = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = profile?.active_role || profile?.role
    if (!profile || (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE')) {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const { id: tenantId } = await params

    const { data: tenant } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, avatar_url, is_active, gender, city, address, neoface_verified, oneci_verified, created_at')
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Locataire introuvable' }, { status: 404 })
    }

    // Verify this owner has leases with this tenant
    const { data: ownerLeases } = await supabase
      .from('leases')
      .select('*')
      .eq('owner_id', userId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (!ownerLeases || ownerLeases.length === 0) {
      return NextResponse.json({ error: 'Ce locataire ne fait pas partie de vos locataires' }, { status: 403 })
    }

    const leaseIds = ownerLeases.map(l => l.id)
    const propertyIds = [...new Set(ownerLeases.map(l => l.property_id).filter(Boolean))]

    // Fetch related data
    const [
      { data: properties },
      { data: propImages },
      { data: payments },
      { data: rentalFiles },
      { data: maintenanceReqs },
      { data: leaseRatings },
    ] = await Promise.all([
      propertyIds.length > 0
        ? supabase.from('properties').select('id, title, type, address, city, commune, area, bedrooms').in('id', propertyIds)
        : { data: [] as any[] },
      propertyIds.length > 0
        ? supabase.from('property_images').select('id, url, order, property_id').in('property_id', propertyIds).order('order', { ascending: true })
        : { data: [] as any[] },
      leaseIds.length > 0
        ? supabase.from('payments').select('*').in('lease_id', leaseIds).order('due_date', { ascending: false })
        : { data: [] as any[] },
      leaseIds.length > 0
        ? supabase.from('rental_files').select('*').in('lease_id', leaseIds)
        : { data: [] as any[] },
      leaseIds.length > 0
        ? supabase.from('maintenance_requests').select('id, title, status, priority, created_at, lease_id').in('lease_id', leaseIds).order('created_at', { ascending: false }).limit(10)
        : { data: [] as any[] },
      leaseIds.length > 0
        ? supabase.from('ratings').select('id, score, comment, created_at, from_user_id, lease_id').in('lease_id', leaseIds)
        : { data: [] as any[] },
    ])

    // Fetch rental file documents if rental files exist
    const rfIds = (rentalFiles ?? []).map(rf => rf.id).filter(Boolean)
    const { data: rfDocuments } = rfIds.length > 0
      ? await supabase.from('rental_file_documents').select('id, type, name, status, tc_comment, rental_file_id').in('rental_file_id', rfIds)
      : { data: [] as any[] }

    // Fetch rating fromUser info
    const fromUserIds = [...new Set((leaseRatings ?? []).map((r: any) => r.from_user_id).filter(Boolean))]
    const { data: fromUsers } = fromUserIds.length > 0
      ? await supabase.from('users').select('id, first_name, last_name').in('id', fromUserIds)
      : { data: [] as any[] }
    const fromUserMap = new Map((fromUsers ?? []).map((u: any) => [u.id, u]))

    const propMap = new Map((properties ?? []).map((p: any) => [p.id, p]))
    const imgByProp = new Map<string, any[]>()
    for (const img of propImages ?? []) {
      if (!imgByProp.has(img.property_id)) imgByProp.set(img.property_id, [])
      imgByProp.get(img.property_id)!.push(img)
    }
    const payByLease = new Map<string, any[]>()
    for (const p of payments ?? []) {
      if (!payByLease.has(p.lease_id)) payByLease.set(p.lease_id, [])
      payByLease.get(p.lease_id)!.push(p)
    }
    const rfByLease = new Map<string, any>()
    for (const rf of rentalFiles ?? []) {
      if (rf.lease_id) rfByLease.set(rf.lease_id, rf)
    }
    const rfDocByRf = new Map<string, any[]>()
    for (const d of rfDocuments ?? []) {
      if (!rfDocByRf.has(d.rental_file_id)) rfDocByRf.set(d.rental_file_id, [])
      rfDocByRf.get(d.rental_file_id)!.push(d)
    }
    const maintByLease = new Map<string, any[]>()
    for (const m of maintenanceReqs ?? []) {
      if (!maintByLease.has(m.lease_id)) maintByLease.set(m.lease_id, [])
      maintByLease.get(m.lease_id)!.push(m)
    }
    const ratingByLease = new Map<string, any[]>()
    for (const r of leaseRatings ?? []) {
      if (!ratingByLease.has(r.lease_id)) ratingByLease.set(r.lease_id, [])
      ratingByLease.get(r.lease_id)!.push(r)
    }

    // Compute payment stats across all leases
    const allPayments = payments ?? []
    const totalPaid = allPayments
      .filter((p: any) => p.status === 'PAID')
      .reduce((sum: number, p: any) => sum + p.amount, 0)
    const totalPending = allPayments
      .filter((p: any) => p.status === 'PENDING')
      .reduce((sum: number, p: any) => sum + p.amount, 0)
    const totalLate = allPayments
      .filter((p: any) => p.status === 'LATE')
      .reduce((sum: number, p: any) => sum + p.amount, 0)
    const paidCount = allPayments.filter((p: any) => p.status === 'PAID').length
    const lateCount = allPayments.filter((p: any) => p.status === 'LATE').length
    const pendingCount = allPayments.filter((p: any) => p.status === 'PENDING').length

    const totalCompleted = paidCount + lateCount
    const paymentScore = totalCompleted > 0 ? Math.round((paidCount / totalCompleted) * 100) : 100

    const formattedLeases = ownerLeases.map(l => {
      const prop = propMap.get(l.property_id)
      const imgs = imgByProp.get(l.property_id) ?? []
      const leasePayments = payByLease.get(l.id) ?? []
      const rf = rfByLease.get(l.id) ?? null
      const rfDocs = rf ? (rfDocByRf.get(rf.id) ?? []) : []
      const maintReqs = maintByLease.get(l.id) ?? []
      const ratings = ratingByLease.get(l.id) ?? []

      return {
        id: l.id,
        status: l.status,
        startDate: l.start_date,
        endDate: l.end_date,
        monthlyRent: l.monthly_rent,
        charges: l.charges,
        deposit: l.deposit,
        specialConditions: l.special_conditions,
        ownerSignedAt: l.owner_signed_at,
        tenantSignedAt: l.tenant_signed_at,
        property: prop ? {
          id: prop.id,
          title: prop.title,
          type: prop.type,
          address: prop.address,
          city: prop.city,
          commune: prop.commune,
          area: prop.area,
          bedrooms: prop.bedrooms,
          images: imgs.slice(0, 1).map((i: any) => ({ url: i.url })),
        } : null,
        payments: leasePayments.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          dueDate: p.due_date,
          paidAt: p.paid_at,
          reference: p.reference,
          createdAt: p.created_at,
        })),
        rentalFile: rf ? {
          id: rf.id,
          status: rf.status,
          monthlyIncome: rf.monthly_income,
          employer: rf.employer,
          employmentType: rf.employment_type,
          guarantorName: rf.guarantor_name,
          guarantorPhone: rf.guarantor_phone,
          guarantorRelation: rf.guarantor_relation,
          reviewedAt: rf.reviewed_at,
          documents: rfDocs.map((d: any) => ({
            id: d.id,
            type: d.type,
            name: d.name,
            status: d.status,
            tcComment: d.tc_comment,
          })),
        } : null,
        maintenanceRequests: maintReqs.map((m: any) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          priority: m.priority,
          createdAt: m.created_at,
        })),
        ratings: ratings.map((r: any) => ({
          id: r.id,
          score: r.score,
          comment: r.comment,
          createdAt: r.created_at,
          fromUser: fromUserMap.get(r.from_user_id) ? {
            id: fromUserMap.get(r.from_user_id)!.id,
            firstName: fromUserMap.get(r.from_user_id)!.first_name,
            lastName: fromUserMap.get(r.from_user_id)!.last_name,
          } : null,
        })),
      }
    })

    const resp = NextResponse.json({
      data: {
        tenant: {
          id: tenant.id,
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          email: tenant.email,
          phone: tenant.phone,
          avatarUrl: tenant.avatar_url,
          isActive: tenant.is_active,
          gender: tenant.gender,
          city: tenant.city,
          address: tenant.address,
          neofaceVerified: tenant.neoface_verified,
          oneciVerified: tenant.oneci_verified,
          createdAt: tenant.created_at,
        },
        leases: formattedLeases,
        paymentStats: {
          totalPaid,
          totalPending,
          totalLate,
          paidCount,
          lateCount,
          pendingCount,
          paymentScore,
          totalPayments: allPayments.length,
        },
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Tenant detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
