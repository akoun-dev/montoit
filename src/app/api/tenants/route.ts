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
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined

    // Get all leases for this owner
    let leaseQuery = supabase.from('leases').select('*')
    leaseQuery = leaseQuery.eq('owner_id', userId)
    if (status) leaseQuery = leaseQuery.eq('status', status)

    const { data: rawLeases } = await leaseQuery.order('created_at', { ascending: false })

    const leaseIds = (rawLeases ?? []).map(l => l.id)
    const tenantIds = [...new Set((rawLeases ?? []).map(l => l.tenant_id).filter(Boolean))]
    const propertyIds = [...new Set((rawLeases ?? []).map(l => l.property_id).filter(Boolean))]

    const [{ data: tenants }, { data: properties }, { data: propImages }, { data: payments }, { data: rentalFiles }] = await Promise.all([
      tenantIds.length > 0
        ? supabase.from('users').select('id, first_name, last_name, email, phone, avatar_url, is_active').in('id', tenantIds)
        : { data: [] as any[] },
      propertyIds.length > 0
        ? supabase.from('properties').select('id, title, address, city, commune').in('id', propertyIds)
        : { data: [] as any[] },
      propertyIds.length > 0
        ? supabase.from('property_images').select('property_id, url').in('property_id', propertyIds).order('order', { ascending: true })
        : { data: [] as any[] },
      leaseIds.length > 0
        ? supabase.from('payments').select('id, amount, status, due_date, paid_at, lease_id').in('lease_id', leaseIds).order('due_date', { ascending: false })
        : { data: [] as any[] },
      leaseIds.length > 0
        ? supabase.from('rental_files').select('id, status, monthly_income, employer, employment_type, lease_id').in('lease_id', leaseIds)
        : { data: [] as any[] },
    ])

    const tenantMap = new Map((tenants ?? []).map((t: any) => [t.id, t]))
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

    const tenantAgg = new Map<string, any>()

    for (const lease of rawLeases ?? []) {
      const t = tenantMap.get(lease.tenant_id)
      if (!t) continue

      const prop = propMap.get(lease.property_id)
      const imgs = imgByProp.get(lease.property_id) ?? []
      const leasePayments = payByLease.get(lease.id) ?? []
      const rf = rfByLease.get(lease.id) ?? null

      const leaseData = {
        id: lease.id,
        status: lease.status,
        startDate: lease.start_date,
        endDate: lease.end_date,
        monthlyRent: lease.monthly_rent,
        charges: lease.charges,
        deposit: lease.deposit,
        property: {
          id: prop?.id,
          title: prop?.title,
          address: prop?.address,
          city: prop?.city,
          commune: prop?.commune,
          images: imgs.map((i: any) => ({ url: i.url })),
        },
        payments: leasePayments.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          dueDate: p.due_date,
          paidAt: p.paid_at,
        })),
        rentalFile: rf ? {
          id: rf.id,
          status: rf.status,
          monthlyIncome: rf.monthly_income,
          employer: rf.employer,
          employmentType: rf.employment_type,
        } : null,
      }

      const existing = tenantAgg.get(t.id)
      if (existing) {
        existing.leases.push(leaseData)
      } else {
        tenantAgg.set(t.id, {
          id: t.id,
          firstName: t.first_name,
          lastName: t.last_name,
          email: t.email,
          phone: t.phone,
          avatarUrl: t.avatar_url,
          isActive: t.is_active,
          leases: [leaseData],
        })
      }
    }

    let tenantsList = Array.from(tenantAgg.values())

    if (search) {
      const q = search.toLowerCase()
      tenantsList = tenantsList.filter(t =>
        t.firstName.toLowerCase().includes(q) ||
        t.lastName.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.phone && t.phone.includes(q))
      )
    }

    const tenantsWithStats = tenantsList.map(t => {
      const allPayments = t.leases.flatMap((l: any) => l.payments)
      const totalPaid = allPayments
        .filter((p: any) => p.status === 'PAID')
        .reduce((sum: number, p: any) => sum + p.amount, 0)
      const totalDue = t.leases.reduce((sum: number, l: any) => sum + l.monthlyRent, 0)
      const latePayments = allPayments.filter((p: any) => p.status === 'LATE').length
      const pendingPayments = allPayments.filter((p: any) => p.status === 'PENDING').length
      const activeLeases = t.leases.filter((l: any) => l.status === 'ACTIVE').length
      const hasActiveLease = activeLeases > 0

      return {
        ...t,
        stats: {
          totalPaid,
          totalDue,
          latePayments,
          pendingPayments,
          activeLeases,
          hasActiveLease,
        },
      }
    })

    const globalStats = {
      totalTenants: tenantsWithStats.length,
      activeTenants: tenantsWithStats.filter(t => t.stats.hasActiveLease).length,
      totalRevenue: tenantsWithStats.reduce((s, t) => s + t.stats.totalPaid, 0),
      latePayments: tenantsWithStats.reduce((s, t) => s + t.stats.latePayments, 0),
    }

    const resp = NextResponse.json({
      data: tenantsWithStats,
      stats: globalStats,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Tenants GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
